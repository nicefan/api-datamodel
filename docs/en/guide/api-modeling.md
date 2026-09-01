# API Modeling

`api-datamodel` uses a Service to store a set of service settings, then creates APIs organized by business module. Application code ultimately interacts with `userApi`, `orderApi`, and `fileApi`, not scattered URLs.

```text
createService(options)
        ↓
      Service
        ↓
createApi('user', methods)
        ↓
      userApi
```

## Service

### Creating a Service

```ts
import axios from 'axios'
import { createService } from 'api-datamodel'

export const service = createService({
  adapter: axios,
  baseUrl: '/api',
})
```

`createService(options)` stores the adapter, service URL, default request configuration, and response rules, then returns a Service. See [Request Handling](./request) for the full configuration.

The top-level `createService()` uses the built-in `Resource` by default. Most projects only need the top-level entry point and do not need to understand `Http` and `Resource` up front.

### `service.http`

`service.http` is a service-level request instance without a module path. It is useful for health checks and other requests that do not belong to a business module:

```ts
await service.http.get('health')
```

Business endpoints should still be organized through `createApi()` so application code does not depend on request paths again.

### `service.with()`

When the backend and request rules are shared but a few settings differ, derive another Service:

```ts
const systemService = service.with({ basePath: 'system' })
const workflowService = service.with({ basePath: 'workflow' })
```

`with()` shallow-merges settings and returns an independent Service without changing the source Service. Callers must merge nested objects such as `defRequestConfig` themselves.

## Business API

### Creating a Business API

```ts
interface User {
  id: number
  name: string
}

interface UserQuery {
  keyword?: string
  page: number
}

export const userApi = service.createApi('user', {
  list(query: UserQuery, config?: RequestConfig) {
    return this.$http.get<User[]>('list', query, config)
  },

  save(data: Partial<User>, config?: RequestConfig) {
    return this.$http.post<number>('save', data, config)
  },
})
```

`createApi(modulePath, methods)` creates an independent request instance for the module, binds the business methods to a new object, and exposes that instance through the read-only `$http` property.

```ts
const users = await userApi.list({ page: 1 })
const id = await userApi.save({ name: 'Alice' })
```

Even if a business method is named `get`, `post`, or `request`, always call the underlying request explicitly through `this.$http` to avoid ambiguity.

### Business APIs Without a Module Path

Omit `modulePath` when no module prefix is needed:

```ts
const healthApi = service.createApi({
  check() {
    return this.$http.get('health')
  },
})
```

### Relationship Between Request Instances

```text
HttpOptions
    ↓
createService()
    ↓
Service stores settings
├─ service.http        → independent Resource instance
├─ createApi('user')   → independent Resource instance
└─ createApi('order')  → independent Resource instance
```

These instances share the request settings of their Service, but state from one module instance cannot affect another. Read [Request Extensions](./extensions) when you need to understand or extend `Http` and `Resource`.

## Request Paths

A complete request URL contains four parts:

```text
baseUrl + basePath + modulePath + requestPath
```

| Part | Configured in | Intended meaning |
| --- | --- | --- |
| `baseUrl` | `HttpOptions` | Backend or proxy URL for the current environment or platform |
| `basePath` | `HttpOptions` | Reusable service base path across environments |
| `modulePath` | `service.createApi()` | Business module prefix such as user or order |
| `requestPath` | `$http` request method | Path within the module such as list, save, or detail |

For example:

```ts
const service = createService({
  adapter: axios,
  baseUrl: '/gateway',
  basePath: 'system',
})

const userApi = service.createApi('user', {
  list() {
    return this.$http.get('list')
  },
})
```

The final URL is:

```text
/gateway/system/user/list
```

Simple projects usually need only `baseUrl`. Use both `baseUrl` and `basePath` when you need to distinguish an environment-specific address from a reusable business-service base path.

Path composition ignores empty segments, removes extra leading and trailing `/` characters from business path segments, and preserves the protocol and domain in `baseUrl`. We recommend omitting leading and trailing `/` from `basePath`, `modulePath`, and `requestPath`.

## Service Derivation and Multiple Services

When Web and App use different addresses but share business paths, create separate Services:

```ts
const webService = createService({
  adapter: axios,
  baseUrl: '/gateway',
  basePath: 'system',
})

const appService = createService({
  adapter: buildAdapter(uni),
  baseUrl: 'https://example.com/gateway',
  basePath: 'system',
})
```

Call `createService()` again when the backend URL, authentication, response shape, or request rules differ. Use `service.with()` only for local configuration differences under the same rules.

## Service Type

```ts
interface Service<H> {
  readonly http: H
  readonly createApi: {
    <T>(methods: T): T & { readonly $http: H }
    <T>(modulePath: string, methods?: T): T & { readonly $http: H }
  }
  with(overrides: Partial<HttpOptions>): Service<H>
}
```
