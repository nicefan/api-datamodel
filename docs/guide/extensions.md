# 请求扩展

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
  baseUrl: '/api',
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

## 独立使用 Http

不需要 Service 和业务模块时，也可以直接创建请求实例：

```ts
import axios from 'axios'
import { Http } from 'api-datamodel'

const http = new Http({
  adapter: axios,
  baseUrl: '/api',
})

const health = await http.get('health')
```

```text
new Http(options)       → 直接获得一个请求实例
createService(options)  → 获得可重复创建模块实例的 Service
service.createApi()     → 获得带独立请求实例的业务模块
```

普通业务仍应优先使用 Service 和 Business API；直接创建 Http 适合不需要业务模块建模的底层场景。不同网络请求实现的接入方式见 [请求适配器](./adapter)。
