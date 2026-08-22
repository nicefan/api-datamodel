# DataModel

DataModel 是 `api-datamodel` 的核心 API 分层模型，用于将请求实现、后台服务规则和业务接口描述进行分离。

核心职责：

- Adapter：连接具体请求实现。
- Http：处理通用请求能力。
- Resource：定义后台服务边界。
- Api：描述业务模块接口。

```text
Adapter → Http → Resource → Api
```

## Adapter

Adapter 是实际发送 HTTP 请求的实现。

DataModel 不绑定具体请求库，只要求 Adapter 接收请求配置并返回 Promise。

```ts
import { fetchAdapter, defineConfig } from 'api-datamodel'

const config = defineConfig({
  adapter: fetchAdapter,
})
```

支持：

- fetch
- Axios
- UniApp
- Taro
- 自定义请求实现

Adapter 只负责网络请求，不包含业务规则。

## Http

Http 是通用请求处理层，负责请求生命周期管理。

主要能力：

- request
- get
- post
- put
- delete
- 请求配置合并
- 请求取消
- Loading / Message 处理
- Adapter 调用
- 跨平台请求衔接

Http 可以独立使用，也可以作为 Resource 的基础能力。

## Resource

Resource 是 DataModel 的核心业务资源层，用于描述一个后台服务的访问规则。

Resource 负责：

- serverUrl
- rootPath
- 默认请求配置
- 鉴权处理
- 请求拦截
- 返回数据转换
- 服务级公共能力

通常项目只需要一个默认 Resource：

```text
默认资源配置
      ↓
createApi
      ↓
userApi / orderApi
```

当项目连接多个后台服务时，可以按服务域创建多个 Resource：

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

不同 Resource 可以拥有独立的：

- 服务地址
- Token
- Header
- 请求参数
- 返回数据结构

## Api

Api 用于描述具体业务模块。

例如：

```ts
export const userApi = createApi('user', {
  list(query) {
    return this.$http.get('list', query)
  },

  save(data) {
    return this.$http.post('save', data)
  },
})
```

业务代码：

```ts
await userApi.list({ page: 1 })
await userApi.save(data)
```

Api 不负责：

- 服务地址
- 鉴权
- 请求实现
- 返回转换

这些由 Resource 和 Http 统一处理。

## $http

每个业务 Api 实例都会提供只读的 `$http` 属性。

它是当前 Resource 的底层 Http 实例，继承：

- 服务地址
- 请求配置
- 拦截器
- 消息处理

当业务方法名称覆盖底层方法时，应使用 `$http` 调用：

```ts
export const userApi = createApi('user', {
  delete(id) {
    return this.$http.delete(`delete/${id}`)
  },
})
```

## Resource 扩展

`ApiResource` 默认提供资源级能力：

```ts
upload()
downloadFile()
```

例如：

```ts
await userApi.upload('avatar', formData)

await userApi.downloadFile('export')
```

如果某个后台服务存在公共扩展能力，可以继承 `ApiResource`：

```ts
class CustomResource extends ApiResource {
  exportFile(path) {
    return this.get(path)
  }
}
```

## 请求路径模型

例如：

```text
/api/user/list
```

对应：

```text
/api
Resource

/user
Api 模块

/list
业务方法
```

最终业务代码：

```ts
userApi.list()
```

无需维护完整 URL。

## 组合能力

DataModel 负责 API 分层管理。

其他能力按需组合：

- `CacheResult`：独立请求缓存管理工具。
- `API Codegen`：根据 Swagger/OpenAPI 自动生成 DataModel API。