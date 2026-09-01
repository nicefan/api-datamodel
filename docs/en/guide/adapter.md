# Request Adapters

An Adapter performs the actual network communication: it receives `RequestConfig` and returns a Promise that follows the runtime contract. Path modeling, business response checks, and request feedback are handled elsewhere in `api-datamodel`.

```ts
interface RequestAdapter {
  (config: RequestConfig): Promise<any>
  [key: string]: any
}
```

## Axios

Axios's call shape and response structure can be used directly as an Adapter. Applications install Axios themselves; `api-datamodel` does not require it.

```bash
pnpm add api-datamodel axios
```

```ts
import axios from 'axios'
import { createService } from 'api-datamodel'

export const service = createService({
  adapter: axios,
  baseUrl: '/api',
})
```

`RequestConfig` covers common Axios settings including `method`, `headers`, `params`, `data`, `timeout`, `withCredentials`, `responseType`, `signal`, and progress callbacks. Runtime-only fields `silent`, `messageMode`, and `rawResponse` are not passed to the Adapter.

An existing Axios instance can also be used directly:

```ts
const request = axios.create({
  timeout: 30_000,
})

export const service = createService({
  adapter: request,
  baseUrl: '/api',
})
```

Centralized authentication can be implemented with Axios interceptors or the Service's [request interception](./request#request-interception).

## `fetchAdapter`

Browsers and Node.js 18+ support standard Fetch, so you can use the built-in `fetchAdapter` without installing Axios:

```bash
pnpm add api-datamodel
```

```ts
import { createService, fetchAdapter } from 'api-datamodel'

export const service = createService({
  adapter: fetchAdapter,
  baseUrl: '/api',
})
```

Native Fetch input and output differ from the runtime contract. `fetchAdapter` performs these conversions:

- Serializes `params` into the query string, ignores `undefined` and `null`, and repeats parameter names for arrays.
- Serializes plain objects into a JSON body and adds `content-type: application/json` when absent.
- Passes strings, Blob, URLSearchParams, ArrayBuffer, and TypedArray through directly.
- Removes a manually set `content-type` for FormData so the browser can generate the boundary.
- Parses responses as `json`, `text`, or `blob`.
- Converts Fetch Response into an object containing `data`, `status`, `statusText`, and a plain response-header object.
- Converts unsuccessful HTTP statuses into errors.
- Supports `timeout`, `withCredentials`, and `AbortSignal`.

If default JSON parsing fails, the original text is returned. Status 204 or 205 and an empty response body return `null`.

## `buildAdapter`

`buildAdapter(platform)` targets UniApp/Taro-style platforms that provide `request`, `uploadFile`, and `downloadFile`:

```ts
import { buildAdapter, createService } from 'api-datamodel'

export const service = createService({
  adapter: buildAdapter(uni),
  baseUrl: 'https://example.com/api',
})
```

It:

- Converts `headers` to the platform's `header` option.
- Wraps normal requests in Promises.
- Calls `uploadFile` for `multipart/form-data` requests whose data includes `filePath`.
- Calls `downloadFile` when `responseType` is `blob`.
- Converts `AbortSignal` into the platform request task's `abort()` call.
- Converts non-200 statuses into errors.

The current implementation treats only status `200` as successful. Upload response `data` is parsed as a JSON string; a successful download returns a local temporary file path.

## Custom Adapters

To integrate another request library, convert its input and output to the `RequestAdapter` contract:

```ts
const customAdapter: RequestAdapter = async (config) => {
  const result = await customRequest({
    url: config.url,
    method: config.method,
    query: config.params,
    body: config.data,
    headers: config.headers,
    signal: config.signal,
  })

  return {
    data: result.body,
    status: result.status,
    headers: result.headers,
  }
}
```

A custom Adapter should handle the URL, method, query parameters, request body, response type, timeout, and cancellation according to the request library's capabilities, and reject the Promise when the HTTP request fails. Normal JSON responses must return at least `{ data }`; uploads, downloads, and `rawResponse` scenarios should also preserve original information such as status and response headers.
