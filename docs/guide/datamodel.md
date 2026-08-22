# DataModel

DataModel 是 `api-datamodel` 的核心，用于将请求处理、后台服务控制和业务 Api 描述分层。

核心结构：

```
Adapter → Http → Resource → Api
```

## Adapter

Adapter 是实际发送请求的外部实现。

DataModel 不绑定具体请求库，只要求 Adapter 根据请求配置返回 Promise。

```ts
const config = defineConfig({
  adapter: fetchAdapter,
})
```

支持 Axios、UniApp、Taro 或自定义请求实现。

## Http

`Http` 是通用请求处理层，负责请求生命周期管理：

- `request`
- `get`
- `post`
- `put`
- `delete`
- 请求配置合并
- 请求取消
- 消息处理
- Adapter 调用
- 跨平台请求衔接

Http 可以独立使用，也可以作为 Resource 的基础能力。

## Resource

Resource 建立在 `Http` 之上，用于描述一个后台服务。

主要负责：

- `serverUrl` / `rootPath`
- 默认请求配置
- 请求拦截
- 鉴权处理
- 返回数据转换
- 服务级公共能力

普通项目通常只需要一个默认 Resource：

```text
/api
 ↓
createApi
 ↓
userApi / orderApi
```

多个后台服务可以创建多个 Resource，分别管理不同的地址、鉴权和返回规则。

## Resource 扩展

`ApiResource` 默认提供资源级方法：

```ts
upload()
downloadFile()
```

例如：

```ts
await userApi.upload('avatar', formData)

const file = await userApi.downloadFile('export')
```

如果某个服务存在额外公共能力，可以继承 `ApiResource` 扩展：

```ts
class CustomResource extends ApiResource {
  exportFile(path: string) {
    return this.get(path)
  }
}
```

## Api

Api 描述具体业务模块及业务操作。

例如：

```ts
userApi.list()
userApi.getInfo(id)
userApi.save(data)
```

Api 不负责处理：

- 服务地址
- 鉴权
- 请求实现
- 返回结构转换

这些能力由 Resource 和 Http 统一处理。

## 路径分层

以：

```text
/api/user/list
```

为例：

```text
/api
```

表示 Resource，通常对应后台服务或网关前缀。

```text
/user
```

表示 Api 业务模块。

```text
/list
```

表示业务接口操作。

最终业务代码只关注：

```ts
userApi.list()
```

## 多服务域

复杂项目可以创建多个服务 Resource：

```text
system-api
  ↓
createSystemApi
  ↓
userApi

workflow-api
  ↓
createWorkflowApi
  ↓
taskApi
```

不同 Resource 可以拥有独立：

- `serverUrl`
- Token
- Header
- 请求配置
- 数据转换规则

## 组合能力

DataModel 负责 API 分层管理：

- Adapter
- Http
- Resource
- Api

其他能力按需组合：

- `CacheResult`：独立请求缓存管理工具。
- `SwaggerGen`：根据 Swagger/OpenAPI 自动生成 DataModel Api。