# api-datamodel

English | [简体中文](./README.zh-CN.md)

TypeScript request models for business APIs.

`api-datamodel` builds stable Services and business APIs on top of Fetch, Axios, UniApp, and other request implementations. Pages depend on business capabilities such as `userApi` and `orderApi`, rather than scattered URLs and request details.

## Why api-datamodel

- Organize endpoints by business module and manage service URLs and request paths centrally.
- Centralize defaults, authentication, response transformation, loading states, messages, errors, and cancellation.
- Integrate standard Fetch, UniApp, Taro, or a custom request library through adapters.
- Generate types and business APIs with the companion Codegen tool when OpenAPI is available.

```text
Backend API → Service → Business API → Application Code
```

## Installation

```bash
pnpm add api-datamodel axios
```

Applications install Axios themselves. If the runtime supports Fetch, you can install only `api-datamodel` and use the built-in `fetchAdapter`. Node.js 18.17 or later is required.

## Quick Start

Create a Service:

```ts
// src/api/dataModel.ts
import axios from 'axios'
import { createService } from 'api-datamodel'

export const service = createService({
  adapter: axios,
  baseUrl: '/api',
})
```

Define a business API:

```ts
// src/api/user.ts
import { service } from './dataModel'

interface User {
  id: number
  name: string
}

interface UserQuery {
  keyword?: string
  page: number
}

export const userApi = service.createApi('user', {
  list(query: UserQuery) {
    return this.$http.get<User[]>('list', query)
  },
})
```

Call it from application code:

```ts
const users = await userApi.list({ page: 1 })
```

The request URL is `/api/user/list`. See the [guide](https://nicefan.github.io/api-datamodel/en/guide/introduction) for complete coverage of paths, responses, feedback, and extensions.

## Main Features

- Build business APIs with `createService()` and `service.createApi()`.
- Derive service prefixes under the same rules with `service.with()`.
- Unify the request environment with `defineConfig()`, request interceptors, and response transformation.
- Manage loading states, errors, and batched messages with global hooks.
- Cancel individual requests and abort all active requests with the standard `AbortSignal`.
- Upload, download, and extend common request capabilities through `Resource`.
- Connect different platforms through `fetchAdapter`, `buildAdapter`, or a custom adapter.

## API Codegen

Codegen converts Swagger/OpenAPI into TypeScript types and business APIs that continue to use your configured Service:

```text
OpenAPI → API Codegen → TypeScript Types + Business APIs
```

```bash
api-datamodel-codegen sys
```

See the [API Codegen guide](https://nicefan.github.io/api-datamodel/en/codegen/) for configuration, path mapping, method rules, and type rules. The generated directory is a projection of the OpenAPI document; keep business extensions outside it.

## Documentation

- [Introduction](https://nicefan.github.io/api-datamodel/en/guide/introduction)
- [Quick Start](https://nicefan.github.io/api-datamodel/en/guide/getting-started)
- [API Modeling](https://nicefan.github.io/api-datamodel/en/guide/api-modeling)
- [Request Handling](https://nicefan.github.io/api-datamodel/en/guide/request)
- [Request Adapters](https://nicefan.github.io/api-datamodel/en/guide/adapter)
- [Request Extensions](https://nicefan.github.io/api-datamodel/en/guide/extensions)
- [API Codegen](https://nicefan.github.io/api-datamodel/en/codegen/)
- [Codegen Configuration](https://nicefan.github.io/api-datamodel/en/codegen/config)
- [Backend Conventions](https://nicefan.github.io/api-datamodel/en/codegen/backend-conventions)

## Public Exports

```ts
import {
  Http,
  Resource,
  buildAdapter,
  createService,
  defineConfig,
  fetchAdapter,
  setRequestHooks,
} from 'api-datamodel'
```

Public API signatures and behavior are documented by responsibility in the relevant guide chapters instead of being duplicated in a separate API reference.
