# Quick Start

Create and call your first business API in four steps.

## 1. Install

```bash
pnpm add api-datamodel axios
```

Applications install Axios themselves. If the runtime supports Fetch, you can install only `api-datamodel` and use the built-in `fetchAdapter`. Node.js 18.17 or later is required.

## 2. Create a Service

```ts
// src/api/dataModel.ts
import axios from 'axios'
import { createService } from 'api-datamodel'

export const service = createService({
  adapter: axios,
  serverUrl: '/api',
})
```

## 3. Create a Business API

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

The request path in this example is `/api/user/list`. `user` is the module path and `list` is the method's own request path.

## 4. Call the Business API

```ts
const users = await userApi.list({ page: 1 })
```

Application code depends only on `userApi.list()`. The service URL and request implementation stay in the API layer.

## Next Steps

- [API Modeling](./api-modeling)
- [Request Handling](./request)
- [Request Adapters](./adapter)
- [API Codegen](../codegen/)
