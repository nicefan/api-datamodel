# Service 与 Resource

`Http` 提供标准请求方法，`Resource` 在其上补充上传和下载能力。公开的 `createService()` 由 `Resource` 创建 Service，因此业务 API 的 `$http` 默认是 Resource 实例。

## Http

`Http` 可以独立使用：

```ts
import { Http, fetchAdapter } from 'api-datamodel'

const http = new Http({
  adapter: fetchAdapter,
  serverUrl: '/api',
})

const health = await http.get('health')
```

它提供 `request`、`get`、`post`、`put`、`delete` 和 `setMessage`。

## Resource

`Resource` 继承 `Http`，并提供：

```ts
upload(requestPath, data, config?)
downloadFile(requestPath, config?)
```

上传示例：

```ts
const formData = new FormData()
formData.append('file', file)

await fileApi.$http.upload('avatar', formData)
```

下载返回 `{ filename, data }`，其中 `filename` 从响应的 `Content-Disposition` 中解析：

```ts
const { filename, data } = await fileApi.$http.downloadFile('export')
```

## 创建 Service

```ts
import { createService, fetchAdapter } from 'api-datamodel'

export const service = createService({
  adapter: fetchAdapter,
  serverUrl: '/api',
  rootPath: 'system',
})

export const createApi = service.createApi
```

Service 的 `http` 适合不属于某个业务模块的请求：

```ts
await service.http.get('health')
```

`createApi()` 支持有模块路径和无模块路径两种形式：

```ts
const userApi = service.createApi('user', {
  list() {
    return this.$http.get('list')
  },
})

const commonApi = service.createApi({
  health() {
    return this.$http.get('health')
  },
})
```

## 派生 Service

```ts
const v2Service = service.with({ rootPath: 'v2' })
```

配置采用对象浅合并。嵌套对象如 `defRequestConfig` 需要调用方自行完整合并：

```ts
const authenticatedService = service.with({
  defRequestConfig: {
    ...defaultHttpOptions.defRequestConfig,
    headers: { Authorization: `Bearer ${token}` },
  },
})
```

## 自定义 Resource

需要为一组 Service 增加通用请求能力时，可继承 `Resource`：

```ts
import { Resource, fetchAdapter } from 'api-datamodel'

class CustomResource extends Resource {
  exportReport(requestPath: string) {
    return this.downloadFile(requestPath)
  }
}

export const reportService = CustomResource.createService({
  adapter: fetchAdapter,
  serverUrl: '/report-api',
})

export const reportApi = reportService.createApi('report', {
  monthly() {
    return this.$http.exportReport('monthly')
  },
})
```

`reportService.http` 与各 API 的 `$http` 都是 `CustomResource` 的实例，并共享该 Service 的配置。

## 多服务域

不同地址、鉴权或响应结构应使用不同 Service：

```ts
const systemService = createService({
  ...defaultHttpOptions,
  serverUrl: '/system-api',
})

const workflowService = createService({
  ...defaultHttpOptions,
  serverUrl: '/workflow-api',
})
```

页面只依赖各业务 API，无需重复处理服务地址和鉴权规则。
