# Request Handling

Business methods send requests through `$http`. Each request passes through default configuration, request interceptors, the Adapter, and response transformation. At runtime, loading states, messages, errors, and cancellation are managed at the same time.

```text
Business Method
   ↓
Merge Defaults
   ↓
requestInterceptors
   ↓
RequestAdapter
   ↓
transformResponse
   ↓
Return Business Data
```

## Request Methods

```ts
$http.get<T>(requestPath, params?, config?)
$http.post<T>(requestPath, data?, config?)
$http.put<T>(requestPath, data?, config?)
$http.delete<T>(requestPath, params?, config?)
$http.request<T>(requestPath, config?)
```

For GET and DELETE, the second argument is used as query parameters. For POST and PUT, it is used as the request body. Specify other HTTP methods through `request()`:

```ts
return this.$http.request<User>('activate', {
  method: 'PATCH',
  data: { enabled: true },
})
```

## Request Configuration

### `HttpOptions`

A Service defines its complete request rules with `HttpOptions`:

```ts
interface HttpOptions {
  adapter: RequestAdapter
  baseUrl?: string
  basePath?: string
  defRequestConfig?: DefaultRequestConfig
  requestInterceptors?: (config: RequestConfig) => RequestConfig
  transformResponse?: (result: Obj) => {
    code: number
    message: string
    data: Obj
    success: boolean
  }
}
```

`defineConfig()` returns the configuration unchanged and only provides TypeScript checking and inference:

```ts
import axios from 'axios'
import { defineConfig } from 'api-datamodel'

const options = defineConfig({
  adapter: axios,
  baseUrl: '/api',
  defRequestConfig: {
    timeout: 30_000,
    headers: { 'content-type': 'application/json' },
  },
})
```

### Defaults and Per-request Configuration

`defRequestConfig` can set `headers`, `timeout`, `withCredentials`, `silent`, `messageMode`, and `signal`. Each request shallow-merges the defaults with its own configuration, with per-request values taking precedence.

```ts
await userApi.list(
  { page: 1 },
  {
    timeout: 10_000,
    headers: { 'x-trace-id': traceId },
  },
)
```

Nested objects such as `headers` are not deep-merged automatically. Callers must preserve any default fields they still need.

### `RequestConfig`

| Field | Purpose |
| --- | --- |
| `method` | HTTP method |
| `headers` | Request headers |
| `params` | URL query parameters |
| `data` | Request body |
| `timeout` | Timeout in milliseconds |
| `withCredentials` | Whether to include cross-origin credentials |
| `responseType` | `json`, `text`, or `blob` |
| `signal` | Cancellation signal for one request |
| `onUploadProgress` | Receives upload progress when supported by the Adapter |
| `onDownloadProgress` | Receives download progress when supported by the Adapter |
| `silent` | Excludes the request from loading and message feedback |
| `messageMode` | Error display mode: `none`, `message`, or `modal` |
| `rawResponse` | Whether to skip business response handling |

`url` and `baseURL` are also Adapter settings, but business methods usually pass only a relative `requestPath`. The runtime creates the final `url` according to the rules in [API Modeling](./api-modeling#request-paths).

## Request Interception

`requestInterceptors` runs synchronously after the final URL and defaults have been prepared but before the Adapter runs. Use it to add authentication and headers centrally:

```ts
requestInterceptors(config) {
  return {
    ...config,
    headers: {
      ...config.headers,
      Authorization: `Bearer ${getToken()}`,
    },
  }
}
```

The runtime always passes its internal cancellation signal to the Adapter, so an interceptor cannot replace external per-request cancellation or global abort behavior.

## Response Handling

### Business Response Transformation

When the backend uses a standard business envelope, convert it into the fixed structure with `transformResponse`:

```ts
transformResponse(result) {
  const { code, msg, data } = result
  return {
    code,
    message: msg,
    data,
    success: code === 0,
  }
}
```

```text
success = true  → the business method returns data
success = false → the Promise rejects and enters error handling
```

If response `data` contains neither `success` nor `code`, the runtime returns that `data` directly, so endpoints without a standard envelope also work normally.

### Raw Responses and Response Types

`rawResponse: true` returns the Adapter response directly and skips transformation, business success checks, and collection of backend success messages:

```ts
const response = await userApi.$http.get('list', query, {
  rawResponse: true,
})
```

- `true`: always return the raw response;
- `false`: always perform business response handling;
- omitted: automatically return the raw response when the final `responseType` is not `json`.

Supported `responseType` values are `json`, `text`, and `blob`; actual parsing capabilities depend on the Adapter.

## Request Feedback

The Adapter still executes requests concurrently. Feedback management does not queue, rate-limit, deduplicate, retry, or cache requests. It only coordinates active requests and UI-related loading states, messages, errors, and global aborts.

### Configuring Request Hooks

```ts
interface RequestHooks {
  showLoading?(): void
  interceptError?(error: any, context: { abortAll(): void }): void
  complete?(result: RequestBatchResult): void
}

interface RequestBatchResult {
  errors: MessageData[]
  successes: MessageData[]
}
```

```ts
import { setRequestHooks } from 'api-datamodel'

setRequestHooks({
  showLoading() {
    // Show the global loading indicator.
  },
  interceptError(error, { abortAll }) {
    if (error.code === 401) abortAll()
  },
  complete({ errors, successes }) {
    // Hide the loading indicator and display messages for this batch.
  },
})
```

Hooks are global. Calling `setRequestHooks()` again replaces the entire current object. Errors thrown by a hook do not change the original request or later feedback.

`showLoading()` runs when a normal request lasts longer than 200 ms. `complete()` runs after every request in the same batch finishes. When a non-cancellation error arrives, `interceptError()` runs immediately with normalized `code`, `message`, and the current request's `messageMode`.

### Success Messages and `setMessage()`

A non-empty `message` from a successful business response is added to `successes`. A business method can also set a success message manually:

```ts
save(data: UserInput) {
  return this.$http.post('save', data).then((result) => {
    this.$http.setMessage('Saved successfully')
    return result
  })
}
```

The first manual success message clears backend success messages collected earlier. Later backend success messages are no longer collected, while subsequent manual messages are retained. Error messages are always retained independently.

### `messageMode` and `silent`

`messageMode` is passed with normalized errors to the feedback hook. The application decides whether to use a regular message, modal, or no notification.

`silent: true` marks a request as silent:

- It does not trigger loading feedback.
- It is not added to success or error message arrays.
- Non-cancellation errors still enter global `interceptError()`.
- It remains subject to global aborts.

## Request Cancellation

### Canceling One Request

Use the standard `AbortSignal` for an individual request:

```ts
const controller = new AbortController()
const request = userApi.list(
  { page: 1 },
  { signal: controller.signal },
)

controller.abort('The page was closed')
await request
```

The Adapter must respond to the supplied `signal`. Axios, the built-in `fetchAdapter`, and `buildAdapter` all support standard cancellation signals.

### Global Abort

`abortAll` is not exported as a standalone public function. It is available only through the `interceptError` context and is intended for system-level errors such as an expired login:

```ts
interceptError(error, { abortAll }) {
  if (error.code === 401) abortAll()
}
```

Its scope spans different Services, business APIs, and standalone Http instances, including `silent` requests.

A canceled request still ends with a rejected Promise, but cancellation is not treated as a normal business error: it does not call `interceptError()` or collect success or error messages.
