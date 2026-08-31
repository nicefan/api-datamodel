# 快速开始

用四步创建并调用第一个业务 API。

## 1. 安装

```bash
pnpm add api-datamodel
```

运行环境需要 Node.js 18.17 或更高版本。浏览器和 Node.js 18+ 可以直接使用内置 `fetchAdapter`。

## 2. 创建 Service

```ts
// src/api/dataModel.ts
import { createService, fetchAdapter } from 'api-datamodel'

export const service = createService({
  adapter: fetchAdapter,
  serverUrl: '/api',
})
```

## 3. 创建业务 API

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

此例的请求路径是 `/api/user/list`。`user` 是模块路径，`list` 是方法自己的请求路径。

## 4. 调用业务 API

```ts
const users = await userApi.list({ page: 1 })
```

业务代码只依赖 `userApi.list()`，服务地址和请求实现留在 API 层维护。

## 下一步

- [Service 与业务 API](./service-api)
- [服务前缀与模块路径](./request-path)
- [请求与响应](./request)
- [API Codegen](../codegen/)
