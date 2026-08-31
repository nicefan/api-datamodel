# 请求与响应

业务方法通过 `$http` 发起请求。一次请求依次经过默认配置、请求拦截器、Adapter 和响应转换，最后向业务代码返回数据。

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

GET 和 DELETE 的第二个参数作为查询参数，POST 和 PUT 的第二个参数作为请求体。其他 HTTP 方法通过 `request()` 指定：

```ts
return this.$http.request<User>('activate', {
  method: 'PATCH',
  data: { enabled: true },
})
```

## Service 请求配置

```ts
interface HttpOptions {
  adapter: RequestAdapter
  serverUrl?: string
  rootPath?: string
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

```ts
import { defineConfig, fetchAdapter } from 'api-datamodel'

const options = defineConfig({
  adapter: fetchAdapter,
  serverUrl: '/api',
  defRequestConfig: {
    timeout: 30_000,
    headers: { 'content-type': 'application/json' },
  },
})
```

`defineConfig()` 原样返回配置，只提供 TypeScript 类型检查和推导。

## 默认配置与单次配置

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

## `RequestConfig`

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
| `onUploadProgress` | 适配器支持时接收上传进度 |
| `onDownloadProgress` | 适配器支持时接收下载进度 |
| `silent` | 不参与反馈批次，完整语义见 [请求批次管理](./request-feedback) |
| `messageMode` | 错误提示模式：`none`、`message` 或 `modal` |
| `rawResponse` | 是否跳过业务响应处理 |

`url` 和 `baseURL` 也属于适配器配置，但业务方法通常只传相对 `requestPath`，最终 `url` 由运行时根据 [服务前缀与模块路径](./request-path) 生成。

## 请求拦截器

`requestInterceptors` 在最终 URL 和默认配置准备好后、Adapter 执行前同步调用：

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

运行时始终把内部取消信号交给 Adapter，因此外部单请求取消和 `abortAll()` 不会被拦截器替换掉。

## 响应转换

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

成功响应中的非空 `message` 会进入反馈批次。错误如何拦截、消息如何结算，见 [请求批次管理](./request-feedback)。

如果响应 `data` 中没有 `success` 和 `code`，运行时直接返回该 `data`，因此没有统一包装结构的接口也可以正常使用。

## 原始响应

`rawResponse: true` 直接返回 Adapter 响应，跳过响应转换、业务成功判断和后端成功消息收集：

```ts
const response = await userApi.$http.get('list', query, {
  rawResponse: true,
})
```

- `true`：始终返回原始响应；
- `false`：始终执行业务响应处理；
- 未配置：最终 `responseType` 不是 `json` 时自动返回原始响应。

## 取消单个请求

```ts
const controller = new AbortController()
const request = userApi.list(
  { page: 1 },
  { signal: controller.signal },
)

controller.abort('页面已离开')
await request
```

运行时监听外部 `AbortSignal`，再通过内部控制器管理实际请求。Adapter 需要响应收到的 `signal`；内置 `fetchAdapter` 和 `buildAdapter` 均支持取消。

取消不属于业务错误，不进入错误拦截或消息收集，但会正常注销活动请求并推进反馈批次结算。
