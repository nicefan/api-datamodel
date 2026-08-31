# 快速开始

用四步创建并调用第一个业务 API。

## 1. 安装

```bash
pnpm add api-datamodel axios
```

Axios 由业务项目自行安装。如果运行环境支持 Fetch，也可以只安装 `api-datamodel`，并直接使用内置 `fetchAdapter`。运行环境需要 Node.js 18.17 或更高版本。

## 2. 创建 Service

```ts
// src/api/dataModel.ts
import axios from 'axios'
import { createService } from 'api-datamodel'

export const service = createService({
  adapter: axios,
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

- [API 建模](./api-modeling)
- [请求处理](./request)
- [请求适配器](./adapter)
- [API Codegen](../codegen/)
