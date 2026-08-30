# 快速开始

`api-datamodel` 用 Service 集中管理请求配置，再由 Service 创建各业务模块的 API 实例。

```text
RequestAdapter → HttpOptions → Service → API → $http
```

## 安装

```bash
pnpm add api-datamodel
```

运行环境需要 Node.js 18.17 或更高版本。浏览器项目可直接使用内置的 `fetchAdapter`，也可以接入 Axios 或自定义适配器。

## 创建 Service

创建 `src/api/dataModel.ts`：

```ts
import {
  createService,
  defineConfig,
  fetchAdapter,
  setRequestHooks,
} from 'api-datamodel'

setRequestHooks({
  showLoading() {
    // 打开全局 Loading
  },
  interceptError(error, { abortAll }) {
    if (error.code === 401) abortAll()
  },
  complete({ errors, successes }) {
    // 关闭 Loading，并集中展示本批请求的消息
  },
})

export const defaultHttpOptions = defineConfig({
  adapter: fetchAdapter,
  serverUrl: '/api',
  defRequestConfig: {
    timeout: 30_000,
    headers: { 'content-type': 'application/json' },
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
      success: code === 0,
    }
  },
})

export const service = createService(defaultHttpOptions)
export const createApi = service.createApi
```

`transformResponse` 返回 `{ code, message, data, success }`。成功请求直接向业务方法返回 `data`，失败请求进入错误处理。

## 创建业务 API

```ts
import { createApi } from './dataModel'

interface User {
  id: number
  name: string
}

interface UserQuery {
  keyword?: string
  page: number
}

export const userApi = createApi('user', {
  list(query: UserQuery, config?: RequestConfig) {
    return this.$http.get<User[]>('list', query, config)
  },

  getInfo(id: number, config?: RequestConfig) {
    return this.$http.get<User>(`${id}`, undefined, config)
  },

  save(data: Partial<User>) {
    return this.$http.post<number>('save', data).then((id) => {
      this.$http.setMessage('保存成功')
      return id
    })
  },

  delete(id: number) {
    return this.$http.delete<boolean>(`${id}`)
  },
})
```

API 实例只包含传入的业务成员，原型层提供只读的 `$http`。每个 API 都有独立的 Resource 请求实例，并使用所属 Service 的配置。

## 调用与取消

```ts
const users = await userApi.list({ page: 1 })

const controller = new AbortController()
const request = userApi.getInfo(1001, { signal: controller.signal })

controller.abort('页面已离开')
await request
```

所有取消都不会进入 `interceptError`，也不会进入成功或错误消息聚合。

## 请求路径

最终 URL 按以下顺序拼接并规范化：

```text
serverUrl + rootPath + modulePath + requestPath
```

例如 `/api + system + user + list` 得到 `/api/system/user/list`。四部分都可以为空，只需保证最终 URL 对当前适配器合法；业务路径段通常不带前后 `/`。

## 下一步

- [运行时模型](./datamodel)
- [Service 与 Resource](./resource)
- [API 参考](./api-reference)
- [API Codegen](../swagger/)
