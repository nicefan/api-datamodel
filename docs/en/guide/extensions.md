# Request Extensions

`Http` provides `request`, `get`, `post`, `put`, and `delete`. The built-in `Resource` is simply an example that extends `Http` with common request methods. Because the top-level `createService()` uses it by default, ordinary business APIs automatically support upload and download.

```text
Http
  ↓ extend with methods
Resource
  ↓ createService
Service
  ↓ createApi
Business API.$http
```

## How Resource Extends Http

The core form of `Resource` is:

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
          // Keep the original filename from the server if decoding fails.
        }
      }
      return { filename, data }
    })
  }
}
```

The point is not to introduce another required model, but to show that common request capabilities can be implemented directly by extending `Http`.

The top-level entry point is equivalent to:

```ts
const service = Resource.createService(options)
```

Therefore, `service.http` and each business API's `$http` are independent Resource instances.

## Uploading Files

Use `FormData` in browsers:

```ts
const formData = new FormData()
formData.append('file', file)

await fileApi.$http.upload('avatar', formData)
```

When `fetchAdapter` receives native `FormData`, it removes the manually set `content-type` so the browser can generate a header containing the boundary.

UniApp/Taro-style platforms use a file path and field name:

```ts
await fileApi.$http.upload('avatar', {
  filePath: tempFilePath,
  fileKey: 'file',
  userId: 1001,
})
```

## Downloading Files

```ts
const { filename, data } = await fileApi.$http.downloadFile('export')
```

In Web environments, `data` is usually a Blob and `filename` is parsed from `Content-Disposition`. With a platform Adapter, `data` is usually a local temporary file path and the filename must be handled according to the platform's capabilities.

## Adding Request Methods

Extend `Resource` again to add PATCH, GraphQL, or other common request capabilities for the whole project:

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

Every business module created through this Service receives the new capabilities:

```ts
const userApi = service.createApi('user', {
  update(data: UserInput) {
    return this.$http.patch<User>('update', data)
  },
})
```

## Changing Existing Request Methods

You can also override existing methods to add project-wide behavior before or after calling `super`:

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

Only protocol- or platform-level behavior needed by multiple business modules belongs in Resource. Operations unique to one business module should remain business methods in `createApi()`.

## Using Http Directly

When you do not need a Service or business modules, create a request instance directly:

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
new Http(options)       → obtain one request instance directly
createService(options)  → obtain a Service that can create module instances
service.createApi()     → obtain a business module with an independent request instance
```

Ordinary business code should still prefer Services and business APIs. Creating Http directly is useful for low-level scenarios that do not require business-module modeling. See [Request Adapters](./adapter) for integrating different network implementations.
