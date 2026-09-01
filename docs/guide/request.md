# 请求处理

业务方法通过 `$http` 发起请求。一次请求依次经过默认配置、请求拦截器、Adapter 和响应转换，运行时同时管理 Loading、消息、错误和取消状态。

```text
业务方法
   ↓
合并默认配置
   ↓
requestInterceptors
   ↓
RequestAdapter
   ↓
transformResponse
   ↓
返回业务数据
```

## 请求方法

```ts
$http.get<T>(requestPath, params?, config?)
$http.post<T>(requestPath, data?, config?)
$http.put<T>(requestPath, data?, config?)
$http.delete<T>(requestPath, params?, config?)
$http.request<T>(requestPath, config?)
```

GET 和 DELETE 的第二个参数作为查询参数，POST 和 PUT 的第二个参数作为请求体。其他 HTTP Method 通过 `request()` 指定：

```ts
return this.$http.request<User>('activate', {
  method: 'PATCH',
  data: { enabled: true },
})
```

## 请求配置

### `HttpOptions`

Service 使用 `HttpOptions` 定义整套请求规则：

```ts
interface HttpOptions {
  adapter: RequestAdapter
  baseUrl?: string
  basePath?: string
  defRequestConfig?: DefaultRequestConfig
  requestInterceptors?: (config: RequestConfig) => RequestConfig
  transformResponse?: (result: Obj) => {
    code: number
    message: string
    data: Obj
    success: boolean
  }
}
```

`defineConfig()` 原样返回配置，只提供 TypeScript 类型检查和推导：

```ts
import axios from 'axios'
import { defineConfig } from 'api-datamodel'

const options = defineConfig({
  adapter: axios,
  baseUrl: '/api',
  defRequestConfig: {
    timeout: 30_000,
    headers: { 'content-type': 'application/json' },
  },
})
```

### 默认配置与单请求配置

`defRequestConfig` 可以设置 `headers`、`timeout`、`withCredentials`、`silent`、`messageMode` 和 `signal`。每次请求会先浅合并默认配置与单次配置，单次配置优先。

```ts
await userApi.list(
  { page: 1 },
  {
    timeout: 10_000,
    headers: { 'x-trace-id': traceId },
  },
)
```

`headers` 等嵌套对象不会自动深度合并，需要调用方保留仍要使用的默认字段。

### `RequestConfig`

| 字段 | 作用 |
| --- | --- |
| `method` | HTTP 方法 |
| `headers` | 请求头 |
| `params` | URL 查询参数 |
| `data` | 请求体 |
| `timeout` | 超时毫秒数 |
| `withCredentials` | 是否携带跨域凭证 |
| `responseType` | `json`、`text` 或 `blob` |
| `signal` | 单请求取消信号 |
| `onUploadProgress` | Adapter 支持时接收上传进度 |
| `onDownloadProgress` | Adapter 支持时接收下载进度 |
| `silent` | 不参与 Loading 和消息反馈 |
| `messageMode` | 错误提示模式：`none`、`message` 或 `modal` |
| `rawResponse` | 是否跳过业务响应处理 |

`url` 和 `baseURL` 也属于 Adapter 配置，但业务方法通常只传相对 `requestPath`，最终 `url` 由运行时根据 [API 建模](./api-modeling#请求路径) 中的规则生成。

## 请求拦截

`requestInterceptors` 在最终 URL 和默认配置准备好后、Adapter 执行前同步调用，适合统一补充鉴权和请求头：

```ts
requestInterceptors(config) {
  return {
    ...config,
    headers: {
      ...config.headers,
      Authorization: `Bearer ${getToken()}`,
    },
  }
}
```

运行时始终把内部取消信号交给 Adapter，因此外部单请求取消和全局中止不会被拦截器替换掉。

## 响应处理

### 业务响应转换

后端存在统一业务包装时，通过 `transformResponse` 转成固定结构：

```ts
transformResponse(result) {
  const { code, msg, data } = result
  return {
    code,
    message: msg,
    data,
    success: code === 0,
  }
}
```

```text
success = true  → 业务方法返回 data
success = false → Promise 拒绝并进入错误处理
```

如果响应 `data` 中没有 `success` 和 `code`，运行时直接返回该 `data`，因此没有统一包装结构的接口也可以正常使用。

### 原始响应与响应类型

`rawResponse: true` 直接返回 Adapter 响应，跳过响应转换、业务成功判断和后端成功消息收集：

```ts
const response = await userApi.$http.get('list', query, {
  rawResponse: true,
})
```

- `true`：始终返回原始响应；
- `false`：始终执行业务响应处理；
- 未配置：最终 `responseType` 不是 `json` 时自动返回原始响应。

`responseType` 支持 `json`、`text` 和 `blob`，实际解析能力由所用 Adapter 决定。

## 请求反馈

请求仍然由 Adapter 并发执行。反馈管理不负责请求排队、限流、去重、重试或缓存，只统一管理活动请求以及与界面有关的 Loading、消息、错误和全局中止。

### 配置请求 Hooks

```ts
interface RequestHooks {
  showLoading?(): void
  interceptError?(error: any, context: { abortAll(): void }): void
  complete?(result: RequestBatchResult): void
}

interface RequestBatchResult {
  errors: MessageData[]
  successes: MessageData[]
}
```

```ts
import { setRequestHooks } from 'api-datamodel'

setRequestHooks({
  showLoading() {
    // 打开全局 Loading
  },
  interceptError(error, { abortAll }) {
    if (error.code === 401) abortAll()
  },
  complete({ errors, successes }) {
    // 关闭 Loading，并统一展示本批消息
  },
})
```

Hooks 是全局配置，再次调用会整体替换当前对象。Hook 自身抛出的错误不会改变原请求或后续反馈。

普通请求持续超过 200ms 时调用 `showLoading()`；同一批请求全部结束后调用 `complete()`。非取消错误到达时会立即调用 `interceptError()`，并补充规范化后的 `code`、`message` 和当前请求的 `messageMode`。

### 成功消息与 `setMessage()`

业务成功响应中的非空 `message` 会加入 `successes`。业务方法也可以设置手动成功消息：

```ts
save(data: UserInput) {
  return this.$http.post('save', data).then((result) => {
    this.$http.setMessage('保存成功')
    return result
  })
}
```

第一次手动成功消息会清除此前收集的后端成功消息；之后的后端成功消息不再收集，后续手动消息仍会保留。错误消息始终独立保留。

### `messageMode` 与 `silent`

`messageMode` 会随规范化错误传给反馈 Hook，由业务项目决定使用普通消息、弹窗或不提示。

`silent: true` 表示静默请求：

- 不触发 Loading；
- 不进入成功或错误消息数组；
- 非取消错误仍进入全局 `interceptError()`；
- 仍受全局中止控制。

## 请求取消

### 取消单个请求

单请求使用标准 `AbortSignal`：

```ts
const controller = new AbortController()
const request = userApi.list(
  { page: 1 },
  { signal: controller.signal },
)

controller.abort('页面已离开')
await request
```

Adapter 必须响应收到的 `signal`；Axios、内置 `fetchAdapter` 和 `buildAdapter` 均支持标准取消信号。

### 全局中止

`abortAll` 不是独立导出的公共函数，只通过 `interceptError` 的上下文提供，适合在登录失效等系统级错误发生时中止当前所有活动请求：

```ts
interceptError(error, { abortAll }) {
  if (error.code === 401) abortAll()
}
```

它的范围跨越不同 Service、业务 API 和独立 Http 实例，也包括 `silent` 请求。

请求取消时 Promise 仍以拒绝结束，但取消不会作为普通业务错误处理：不调用 `interceptError()`，也不收集成功或错误消息。
