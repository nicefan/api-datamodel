# 快速开始

`api-datamodel` 通过 Resource 管理后台服务规则，再由 Resource 创建业务模块 API。

基本使用流程：

```text
请求适配器
   ↓
Resource 配置
   ↓
业务模块 API
   ↓
页面或业务代码调用
```

## 安装

```bash
pnpm add api-datamodel
```

如果项目使用其他请求库，也可以通过自定义 Adapter 接入。

## 创建默认 Resource

创建 `src/api/dataModel.ts`：

```ts
import {
  defineConfig,
  fetchAdapter,
  serviceInit,
  setLoadingServe,
} from 'api-datamodel'

setLoadingServe({
  show() {},
  close() {},
})

export const defaultResourceConfig = defineConfig({
  adapter: fetchAdapter,

  serverUrl: '/api',

  rootPath: '',

  defRequestConfig: {
    timeout: 30000,
  },

  requestInterceptors(config) {
    // 统一处理 token、租户信息等
    return config
  },

  transformResponse(result) {
    return {
      code: result.code,
      message: result.msg,
      data: result.data,
      success: result.code === 0,
    }
  },
})

export const createApi = serviceInit(defaultResourceConfig)
```

Resource 负责：

- 服务地址
- 默认请求配置
- 鉴权和请求拦截
- 返回数据转换

Api 负责描述具体业务模块。

## 定义业务 Api

```ts
interface User {
  id: number
  name: string
}

export const userApi = createApi('user', {
  list(query) {
    return this.$http.get<User[]>('list', query)
  },

  getInfo(id: number) {
    return this.$http.get<User>(`${id}`)
  },

  save(data) {
    return this.$http.post('save', data)
  },
})
```

业务代码：

```ts
const users = await userApi.list({
  page: 1,
})

const user = await userApi.getInfo(1001)
```

## 请求路径

Resource、Api 和方法会组合成最终请求地址。

例如：

```text
serverUrl  /api
resource   user
method     list
```

最终：

```text
/api/user/list
```

业务代码只关注：

```ts
userApi.list()
```

无需在页面维护完整 URL。

## 使用 $http

业务方法与底层 HTTP 方法同名时，需要通过 `$http` 调用底层请求：

```ts
export const userApi = createApi('user', {
  delete(id) {
    return this.$http.delete(`delete/${id}`)
  },
})
```

`$http` 是当前 Resource 对应的请求实例，会继承：

- 服务地址
- 请求配置
- 拦截器
- 返回转换
- 消息处理

## 多服务场景

普通项目只需要一个默认 Resource。

如果项目连接多个后台服务，可以创建多个 Resource：

```text
系统服务配置
    ↓
createSystemApi
    ↓
userApi

工作流服务配置
    ↓
createWorkflowApi
    ↓
taskApi
```

每个服务域可以拥有独立的：

- serverUrl
- 鉴权方式
- 请求头
- 返回结构转换

## 下一步

- 查看 [DataModel](./datamodel)
- 查看 [Resource](./resource)
- 查看 [API Reference](./api-reference)
