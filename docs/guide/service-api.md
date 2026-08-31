# Service 与业务 API

Service 的作用很简单：保存一套请求配置，并用这套配置创建服务级请求实例和业务模块。

```text
createService(options)
        ↓
      Service
        ↓
createApi('user', methods)
        ↓
      userApi
```

## 创建 Service

```ts
import { createService, fetchAdapter } from 'api-datamodel'

const service = createService({
  adapter: fetchAdapter,
  serverUrl: '/api',
})
```

`adapter` 负责实际发送请求，其他配置用于定义地址、默认请求参数和响应处理。详细配置见 [请求与响应](./request)。

顶层 `createService(options)` 默认使用内置 `Resource` 创建 Service：

```ts
function createService(options: HttpOptions) {
  return Resource.createService(options)
}
```

普通项目只需要使用顶层入口，不需要提前理解 `Http` 和 `Resource`。

## 创建业务 API

```ts
interface User {
  id: number
  name: string
}

const userApi = service.createApi('user', {
  list(query: { page: number }, config?: RequestConfig) {
    return this.$http.get<User[]>('list', query, config)
  },

  save(data: Partial<User>, config?: RequestConfig) {
    return this.$http.post<number>('save', data, config)
  },
})
```

`createApi(modulePath, methods)` 完成两件事：

1. 为当前模块创建一个带 `modulePath` 的独立请求实例；
2. 将业务方法绑定到新对象，并通过只读 `$http` 提供该请求实例。

返回的 `userApi` 只暴露业务能力：

```ts
const users = await userApi.list({ page: 1 })
const id = await userApi.save({ name: 'Alice' })
```

业务方法即使命名为 `get`、`post` 或 `request`，也始终通过 `this.$http` 明确调用底层请求，避免与自身混淆。

## Service 如何生成请求实例

Service 并不包装一个已经创建好的 Http 实例，而是保存请求类型和配置，在需要时创建实例：

```text
HttpOptions
    ↓
createService()
    ↓
Service 保存配置
├─ service.http        → new Resource()
├─ createApi('user')   → new Resource('user')
└─ createApi('order')  → new Resource('order')
```

因此：

- `service.http` 是不带模块前缀的服务级请求实例；
- 每个业务 API 有独立 `$http` 实例；
- 这些实例共享所属 Service 的请求配置；
- 一个模块的状态或扩展不会污染其他模块的请求实例。

不属于具体业务模块的请求可以直接使用 `service.http`：

```ts
await service.http.get('health')
```

## 无模块路径的业务 API

不需要模块前缀时，可以省略 `modulePath`：

```ts
const healthApi = service.createApi({
  check() {
    return this.$http.get('health')
  },
})
```

## 派生与多个 Service

同一后台和请求规则只改变少量配置时，使用 `service.with()`：

```ts
const systemService = service.with({ rootPath: 'system' })
const workflowService = service.with({ rootPath: 'workflow' })
```

`with()` 浅合并配置并返回独立 Service，不修改来源 Service。`defRequestConfig` 等嵌套对象需要调用方自行合并。

后台地址、鉴权、响应结构或请求规则不同时，重新创建 Service：

```ts
const fileService = createService({
  adapter: fetchAdapter,
  serverUrl: 'https://files.example.com',
  requestInterceptors: appendFileToken,
})
```

服务前缀如何划分，见 [服务前缀与模块路径](./request-path)。

## 直接创建 Http

不需要 Service 和业务模块时，也可以直接创建一次性请求实例：

```ts
import { Http, fetchAdapter } from 'api-datamodel'

const http = new Http({
  adapter: fetchAdapter,
  serverUrl: '/api',
})

const health = await http.get('health')
```

可以把两种用法理解为：

```text
new Http(options)       → 直接获得一个请求实例
createService(options)  → 获得可重复创建模块实例的 Service
service.createApi()     → 获得带独立请求实例的业务模块
```

如何通过继承 `Http` 自由增加或改变底层请求方法，见 [上传、适配与请求扩展](./extensions)。

## Service 类型

```ts
interface Service<H> {
  readonly http: H
  readonly createApi: {
    <T>(methods: T): T & { readonly $http: H }
    <T>(modulePath: string, methods?: T): T & { readonly $http: H }
  }
  with(overrides: Partial<HttpOptions>): Service<H>
}
```
