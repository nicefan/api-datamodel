# 快速开始

## 安装

```bash
pnpm add api-datamodel
```

使用 Axios 时同时安装：

```bash
pnpm add axios
```

## 创建 Resource

```ts
import axios from 'axios'
import { defineConfig, serviceInit, setLoadingServe } from 'api-datamodel'

setLoadingServe({
  show() {},
  close() {},
})

const config = defineConfig({
  adapter: axios,
  serverUrl: '/api',
  defRequestConfig: {
    timeout: 30_000,
  },
  requestInterceptors(config) {
    return config
  },
  transformResponse(result) {
    const { code, msg, data } = result
    return {
      code,
      message: msg,
      data,
      success: code === 0 || code === 200,
    }
  },
})

export const createApi = serviceInit(config)
```

## 定义业务 Api

```ts
import { createApi } from './dataModel'

interface User {
  id: number
  name: string
}

export const userApi = createApi('user', {
  list(query: { page: number }) {
    return this.get<User[]>('list', query)
  },
  getInfo(id: number) {
    return this.get<User>(`${id}`)
  },
  save(data: Partial<User>) {
    return this.post<number>('save', data)
  },
  delete(id: number) {
    return this.$http.delete<boolean>(`${id}`)
  },
})
```

## 调用

```ts
const users = await userApi.list({ page: 1 })
const user = await userApi.getInfo(1001)
await userApi.save({ name: 'Tom' })
```

当 `serverUrl` 为 `/api`、Api 模块为 `user`、方法请求 `list` 时，最终请求地址为 `/api/user/list`。
