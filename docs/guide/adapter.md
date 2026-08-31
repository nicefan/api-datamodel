# 请求适配器

Adapter 负责实际网络通信：接收 `RequestConfig`，返回符合运行时要求的 Promise。路径建模、业务响应判断和请求反馈由 `api-datamodel` 的其他部分处理。

```ts
interface RequestAdapter {
  (config: RequestConfig): Promise<any>
  [key: string]: any
}
```

## Axios

Axios 的调用形式和响应结构可以直接作为 Adapter 使用。Axios 由业务项目自行安装，`api-datamodel` 不强制依赖 Axios。

```bash
pnpm add api-datamodel axios
```

```ts
import axios from 'axios'
import { createService } from 'api-datamodel'

export const service = createService({
  adapter: axios,
  serverUrl: '/api',
})
```

`RequestConfig` 覆盖 Axios 常用配置，包括 `method`、`headers`、`params`、`data`、`timeout`、`withCredentials`、`responseType`、`signal` 和进度回调。`silent`、`messageMode`、`rawResponse` 是运行时字段，不会传给 Adapter。

已有 Axios 实例也可以直接使用：

```ts
const request = axios.create({
  timeout: 30_000,
})

export const service = createService({
  adapter: request,
  serverUrl: '/api',
})
```

统一鉴权既可以由 Axios 拦截器完成，也可以使用 Service 的 [请求拦截](./request#请求拦截)。

## `fetchAdapter`

浏览器和 Node.js 18+ 支持标准 Fetch，可以直接使用内置 `fetchAdapter`，无需安装 Axios：

```bash
pnpm add api-datamodel
```

```ts
import { createService, fetchAdapter } from 'api-datamodel'

export const service = createService({
  adapter: fetchAdapter,
  serverUrl: '/api',
})
```

原生 Fetch 的输入输出与运行时约定不同，`fetchAdapter` 负责完成以下转换：

- 将 `params` 序列化到查询字符串，忽略 `undefined` 和 `null`，数组使用重复参数名；
- 将普通对象序列化为 JSON 请求体，并在缺少时补充 `content-type: application/json`；
- 直接传递字符串、Blob、URLSearchParams、ArrayBuffer 和 TypedArray；
- 传入 FormData 时移除手工设置的 `content-type`，由浏览器生成 boundary；
- 按 `json`、`text` 或 `blob` 解析响应；
- 将 Fetch Response 转成包含 `data`、`status`、`statusText` 和普通响应头对象的结构；
- 将非成功 HTTP 状态转换为错误；
- 支持 `timeout`、`withCredentials` 和 `AbortSignal`。

默认 JSON 解析失败时会返回原始文本；状态码为 204 或 205，以及空响应体，返回 `null`。

## `buildAdapter`

`buildAdapter(platform)` 面向提供 `request`、`uploadFile` 和 `downloadFile` 的 UniApp/Taro 类平台：

```ts
import { buildAdapter, createService } from 'api-datamodel'

export const service = createService({
  adapter: buildAdapter(uni),
  serverUrl: 'https://example.com/api',
})
```

它会：

- 将 `headers` 转为平台请求使用的 `header`；
- 将普通请求包装为 Promise；
- 在 `multipart/form-data` 且请求数据含 `filePath` 时调用 `uploadFile`；
- 在 `responseType: 'blob'` 时调用 `downloadFile`；
- 将 `AbortSignal` 转成平台请求任务的 `abort()`；
- 将非 200 状态转换为错误。

当前实现只把状态码 `200` 判断为成功。上传响应的 `data` 会按 JSON 字符串解析；下载成功时返回本地临时文件路径。

## 自定义 Adapter

接入其他请求库，本质上是把它的输入和输出转换成 `RequestAdapter` 所需的结构：

```ts
const customAdapter: RequestAdapter = async (config) => {
  const result = await customRequest({
    url: config.url,
    method: config.method,
    query: config.params,
    body: config.data,
    headers: config.headers,
    signal: config.signal,
  })

  return {
    data: result.body,
    status: result.status,
    headers: result.headers,
  }
}
```

自定义 Adapter 应根据请求库能力处理 URL、方法、查询参数、请求体、响应类型、超时和取消，并在 HTTP 请求失败时拒绝 Promise。普通 JSON 响应至少需要返回 `{ data }`；上传、下载或 `rawResponse` 场景还应保留状态和响应头等原始信息。
