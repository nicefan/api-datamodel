# 上传、适配与请求扩展

`Http` 提供 `request`、`get`、`post`、`put` 和 `delete`。内置 `Resource` 只是一个继承 `Http` 并增加公共请求方法的示例，顶层 `createService()` 默认使用它，所以普通业务 API 自动具有上传和下载能力。

```text
Http
  ↓ 继承并增加方法
Resource
  ↓ createService
Service
  ↓ createApi
Business API.$http
```

## Resource 如何扩展 Http

`Resource` 的核心形式如下：

```ts
class Resource extends Http {
  upload(
    requestPath: string,
    data: FormData | UniFormData,
    config?: RequestConfig,
  ) {
    return this.request(requestPath, {
      headers: { 'content-type': 'multipart/form-data' },
      data,
      method: 'POST',
      ...config,
    })
  }

  downloadFile(requestPath: string, config?: RequestConfig) {
    return this.request<any>(requestPath, {
      responseType: 'blob',
      method: 'GET',
      ...config,
    }).then(({ data, headers }) => {
      const disposition =
        headers?.['content-disposition'] ||
        headers?.['Content-Disposition'] ||
        ''
      const pattern = /filename\*?=(?:UTF-8'')?(?:"([^"]+)"|([^;]+))/i
      const match = disposition.match(pattern)

      let filename = (match?.[1] || match?.[2])?.trim()
      if (filename) {
        try {
          filename = decodeURIComponent(filename)
        } catch {
          // 解码失败时保留服务端返回的原始文件名。
        }
      }
      return { filename, data }
    })
  }
}
```

这里的重点不是增加一层必须学习的模型，而是展示：公共请求能力可以直接通过继承 `Http` 实现。

顶层入口等价于：

```ts
const service = Resource.createService(options)
```

因此 `service.http` 和每个业务 API 的 `$http` 都是独立 Resource 实例。

## 上传文件

浏览器使用 `FormData`：

```ts
const formData = new FormData()
formData.append('file', file)

await fileApi.$http.upload('avatar', formData)
```

`fetchAdapter` 收到原生 `FormData` 时会移除手工设置的 `content-type`，让浏览器生成包含 boundary 的请求头。

UniApp/Taro 类平台使用文件路径和字段名：

```ts
await fileApi.$http.upload('avatar', {
  filePath: tempFilePath,
  fileKey: 'file',
  userId: 1001,
})
```

## 下载文件

```ts
const { filename, data } = await fileApi.$http.downloadFile('export')
```

Web 环境中的 `data` 通常是 `Blob`，`filename` 从 `Content-Disposition` 解析。使用平台 Adapter 时，`data` 通常是本地临时文件路径，文件名需要根据平台能力处理。

## 自由增加请求方法

需要为整个项目增加 PATCH、GraphQL 或其他公共请求能力时，继续继承 `Resource`：

```ts
class ProjectResource extends Resource {
  patch<T>(
    requestPath: string,
    data?: Obj,
    config: RequestConfig = {},
  ) {
    return this.request<T>(requestPath, {
      ...config,
      data,
      method: 'PATCH',
    })
  }

  graphql<T>(query: string, variables?: Obj) {
    return this.post<T>('graphql', { query, variables })
  }
}

export const service = ProjectResource.createService({
  adapter: fetchAdapter,
  serverUrl: '/api',
})
```

通过该 Service 创建的所有业务模块都会获得新能力：

```ts
const userApi = service.createApi('user', {
  update(data: UserInput) {
    return this.$http.patch<User>('update', data)
  },
})
```

## 改变已有请求方法

也可以覆盖已有方法，在调用 `super` 前后添加项目级行为：

```ts
class ProjectResource extends Resource {
  override post<T>(
    requestPath: string,
    data?: Obj,
    config: RequestConfig = {},
  ) {
    return super.post<T>(requestPath, data, {
      ...config,
      headers: {
        ...config.headers,
        'x-client': 'project-web',
      },
    })
  }
}
```

只有多个业务模块都需要的协议级或平台级行为才适合放入 Resource。单个业务模块独有的操作仍应定义在 `createApi()` 的业务方法中。

## 请求适配器

Adapter 只负责实际网络通信：接收 `RequestConfig` 并返回 Promise。路径建模、业务响应判断和反馈批次由运行时其他部分处理。

```ts
interface RequestAdapter {
  (config: RequestConfig): Promise<any>
  [key: string]: any
}
```

### `fetchAdapter`

适用于浏览器和 Node.js 18+，支持查询参数、常见 Body、JSON/Text/Blob 响应、超时、凭证和 `AbortSignal`。

```ts
const service = createService({
  adapter: fetchAdapter,
  serverUrl: '/api',
})
```

### `buildAdapter(platform)`

将具有 `request`、`uploadFile` 和 `downloadFile` 的 UniApp/Taro 类平台对象转换为 Adapter：

```ts
const service = createService({
  adapter: buildAdapter(uni),
  serverUrl: 'https://example.com/api',
})
```

平台请求任务会响应 `AbortSignal` 并调用任务的 `abort()`。

### 自定义 Adapter

接入 Axios 或其他请求库时，只需完成配置和响应形状的映射：

```ts
const axiosAdapter: RequestAdapter = (config) => {
  return axios.request(config)
}
```

自定义 Adapter 应处理 URL、请求方法、参数、请求体、响应类型、超时和取消信号。鉴权等业务项目配置通常放在 [请求与响应](./request#请求拦截器) 的 `requestInterceptors` 中。
