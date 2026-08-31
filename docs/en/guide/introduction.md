# Introduction

`api-datamodel` organizes backend endpoints into stable, reusable, and typed business APIs. It does not replace Fetch, Axios, or platform request libraries; it establishes clear business boundaries on top of network requests.

## Why Model APIs?

Calling a request library directly from pages often scatters URLs, authentication, response checks, and error handling throughout the application:

```text
Page → URL / fetch / axios / Response Checks
```

API modeling consolidates these details into services and business modules:

```text
Page → userApi / orderApi / fileApi
```

Pages only express operations such as “query users” or “submit an order,” while the underlying request rules are maintained centrally.

## Basic Model

```text
HttpOptions
     ↓
  Service
     ↓
Business API
```

- `HttpOptions` defines the adapter, service URL, default request configuration, and response transformation.
- `Service` stores a set of service rules and creates business APIs.
- A business API exposes module-level methods and accesses the underlying request capabilities through `$http`.

For ordinary usage, you only need to understand Services and business APIs. Read [Request Adapters](./adapter) when integrating a network implementation, and [Request Extensions](./extensions) when adding or changing low-level request capabilities.

## Two Ways to Build APIs

You can define a business API manually:

```ts
const userApi = service.createApi('user', {
  list(query: UserQuery) {
    return this.$http.get<User[]>('list', query)
  },
})
```

You can also let API Codegen generate types and business APIs from OpenAPI. Both approaches share the same Service and runtime model, so they are called in exactly the same way.

Next steps:

- [Quick Start](./getting-started)
- [API Modeling](./api-modeling)
- [API Codegen](../codegen/)
