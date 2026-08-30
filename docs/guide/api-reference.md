# API 参考

## `createService(options)`

使用 `Resource` 和 `HttpOptions` 创建 `Service<Resource>`，等价于 `Resource.createService(options)`。

```ts
const service = createService(options)
```

## `defineConfig(options)`

原样返回 `HttpOptions`，用于获得 TypeScript 类型检查和推导。

## `Service`

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

- `http`：Service 级请求实例。
- `createApi`：创建带独立 `$http` 的业务 API。
- `with`：浅合并配置并返回独立 Service。

## `HttpOptions`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `adapter` | `RequestAdapter` | 必填，请求适配器 |
| `serverUrl` | `string` | 服务器地址或代理前缀 |
| `rootPath` | `string` | 业务请求前缀 |
| `defRequestConfig` | `DefaultRequestConfig` | 默认请求配置 |
| `requestInterceptors` | `(config) => config` | 请求发送前的同步处理 |
| `transformResponse` | `(result) => { code, message, data, success }` | 业务响应转换 |

## `Http`

```ts
new Http(options?: HttpOptions)
new Http(modulePath?: string, options?: HttpOptions)
```

| 方法 | 说明 |
| --- | --- |
| `request<R>(requestPath, config?)` | 发起自定义请求 |
| `get<T>(requestPath, params?, config?)` | GET 请求 |
| `post<T>(requestPath, data?, config?)` | POST 请求 |
| `put<T>(requestPath, data?, config?)` | PUT 请求 |
| `delete<T>(requestPath, params?, config?)` | DELETE 请求 |
| `setMessage(message?)` | 向当前请求批次写入手动成功消息 |
| `Http.createService(options)` | 基于当前 Http 类型创建 Service |

## `Resource`

`Resource extends Http`。

| 方法 | 说明 |
| --- | --- |
| `upload(requestPath, data, config?)` | 使用 `multipart/form-data` 发起上传 |
| `downloadFile(requestPath, config?)` | 下载二进制数据并返回 `{ filename, data }` |
| `Resource.createService(options)` | 基于 Resource 创建 Service |

## `RequestConfig`

除常见的 `method`、`headers`、`params`、`data`、`timeout`、`responseType` 等字段外，还支持：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `signal` | `AbortSignal` | 取消单个请求 |
| `silent` | `boolean` | 不参与 Loading 和消息聚合 |
| `messageMode` | `'none' \| 'message' \| 'modal'` | 错误提示方式 |
| `rawResponse` | `boolean` | 是否直接返回适配器原始响应 |

`silent` 请求仍参与错误拦截、活动请求登记和 `abortAll()`。所有取消都不会进入错误拦截或消息聚合。

## `setRequestHooks(hooks)`

设置全局请求生命周期 Hook：

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

再次调用会替换当前全局 Hook 配置。

## 请求适配器

### `fetchAdapter`

标准 Fetch API 的请求适配器，适用于浏览器和 Node.js 18+。

### `buildAdapter(platform)`

将 UniApp、Taro 一类平台对象的 `request`、`uploadFile` 和 `downloadFile` 转换为请求适配器。平台请求任务会响应外部 `AbortSignal`。

## 类型导出

包入口导出 `Service`、`RequestHooks` 和 `RequestBatchResult` 类型。`RequestConfig`、`HttpOptions`、`MessageData` 等请求类型通过包的全局类型声明提供。
