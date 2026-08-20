# Resource

Resource 是后台服务资源层，建立在 `Http` 之上。

## 默认能力

`ApiResource` 默认扩展了两个常用方法：

```ts
upload()
downloadFile()
```

例如：

```ts
await userApi.upload('avatar', formData)

const { filename, data } = await userApi.downloadFile('export')
```

## 自定义 Resource

如果某个后台服务存在自己的公共请求能力，可以继承 `ApiResource` 扩展：

```ts
import { ApiResource } from 'api-datamodel'

class CustomResource extends ApiResource {
  exportFile(path: string) {
    return this.get(path, undefined, {
      responseType: 'blob',
    })
  }
}
```

也可以直接使用 `new ApiResource()` 创建独立实例。

## 多服务域

不同后台服务可以分别创建 Resource：

```ts
import axios from 'axios'
import { ApiResource } from 'api-datamodel'

export const createSystemApi = ApiResource.factory({
  adapter: axios,
  serverUrl: '/system-api',
})

export const createWorkflowApi = ApiResource.factory({
  adapter: axios,
  serverUrl: '/workflow-api',
})
```

再创建对应业务 Api：

```ts
export const userApi = createSystemApi('user', {
  list() {
    return this.get('list')
  },
})

export const taskApi = createWorkflowApi('task', {
  pending() {
    return this.get('pending')
  },
})
```

对应请求路径：

```text
/system-api/user/list
/workflow-api/task/pending
```
