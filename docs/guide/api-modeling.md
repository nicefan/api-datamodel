# API 建模

`api-datamodel` 使用 Service 保存一套服务配置，再由 Service 创建按业务模块组织的 API。业务代码最终面对的是 `userApi`、`orderApi`、`fileApi`，而不是散落的 URL。

```text
createService(options)
        ↓
      Service
        ↓
createApi('user', methods)
        ↓
      userApi
```

## Service

### 创建 Service

```ts
import axios from 'axios'
import { createService } from 'api-datamodel'

export const service = createService({
  adapter: axios,
  baseUrl: '/api',
})
```

`createService(options)` 保存 Adapter、服务地址、默认请求配置和响应处理规则，并返回一个 Service。详细配置见 [请求处理](./request)。

顶层 `createService()` 默认使用内置 `Resource` 创建 Service。普通项目只需要使用顶层入口，不必提前理解 `Http` 和 `Resource`。

### `service.http`

`service.http` 是不带模块路径的服务级请求实例，适合健康检查等不属于具体业务模块的请求：

```ts
await service.http.get('health')
```

业务接口仍应优先通过 `createApi()` 组织，避免业务代码重新依赖请求路径。

### `service.with()`

同一后台和请求规则只改变少量配置时，可以派生新的 Service：

```ts
const systemService = service.with({ basePath: 'system' })
const workflowService = service.with({ basePath: 'workflow' })
```

`with()` 浅合并配置并返回独立 Service，不修改来源 Service。`defRequestConfig` 等嵌套对象需要调用方自行合并。

## Business API

### 创建业务 API

```ts
interface User {
  id: number
  name: string
}

interface UserQuery {
  keyword?: string
  page: number
}

export const userApi = service.createApi('user', {
  list(query: UserQuery, config?: RequestConfig) {
    return this.$http.get<User[]>('list', query, config)
  },

  save(data: Partial<User>, config?: RequestConfig) {
    return this.$http.post<number>('save', data, config)
  },
})
```

`createApi(modulePath, methods)` 为当前模块创建独立请求实例，将业务方法绑定到新对象，并通过只读 `$http` 提供该实例。

```ts
const users = await userApi.list({ page: 1 })
const id = await userApi.save({ name: 'Alice' })
```

即使业务方法命名为 `get`、`post` 或 `request`，也始终通过 `this.$http` 明确调用底层请求，避免与自身混淆。

### 无模块路径的业务 API

不需要模块前缀时，可以省略 `modulePath`：

```ts
const healthApi = service.createApi({
  check() {
    return this.$http.get('health')
  },
})
```

### 请求实例的关系

```text
HttpOptions
    ↓
createService()
    ↓
Service 保存配置
├─ service.http        → 独立 Resource 实例
├─ createApi('user')   → 独立 Resource 实例
└─ createApi('order')  → 独立 Resource 实例
```

这些实例共享所属 Service 的请求配置，但一个模块的实例状态不会污染其他模块。需要理解或扩展 `Http`、`Resource` 时再阅读 [请求扩展](./extensions)。

## 请求路径

完整请求地址由四部分组成：

```text
baseUrl + basePath + modulePath + requestPath
```

| 部分 | 配置位置 | 适合表达 |
| --- | --- | --- |
| `baseUrl` | `HttpOptions` | 当前环境或平台的后台地址、代理地址 |
| `basePath` | `HttpOptions` | 可以跨环境复用的服务基础路径 |
| `modulePath` | `service.createApi()` | user、order 等业务模块前缀 |
| `requestPath` | `$http` 请求方法 | list、save、detail 等模块内路径 |

例如：

```ts
const service = createService({
  adapter: axios,
  baseUrl: '/gateway',
  basePath: 'system',
})

const userApi = service.createApi('user', {
  list() {
    return this.$http.get('list')
  },
})
```

最终地址为：

```text
/gateway/system/user/list
```

简单项目通常只需要配置 `baseUrl`。需要区分环境地址和可复用的业务服务基础路径时，再同时使用 `baseUrl` 和 `basePath`。

路径组合时会忽略空路径段，清理业务路径段两端多余的 `/`，并保留 `baseUrl` 中的协议和域名。推荐 `basePath`、`modulePath`、`requestPath` 均不带前后 `/`。

## Service 派生与多服务

Web 和 App 使用不同地址，但共享相同业务路径时，可以分别创建 Service：

```ts
const webService = createService({
  adapter: axios,
  baseUrl: '/gateway',
  basePath: 'system',
})

const appService = createService({
  adapter: buildAdapter(uni),
  baseUrl: 'https://example.com/gateway',
  basePath: 'system',
})
```

后台地址、鉴权、响应结构或请求规则不同时，应重新调用 `createService()`；只有同一套规则下的局部配置不同，才适合使用 `service.with()`。

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
