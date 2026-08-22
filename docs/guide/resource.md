# Resource

Resource 是后台服务资源层，建立在 `Http` 之上。

它负责描述一个服务的公共规则：

- `serverUrl` / `rootPath`
- 默认请求配置
- 鉴权与请求拦截
- 返回数据转换
- 服务级公共请求能力

## 默认扩展能力

`ApiResource` 在 Http 基础上提供：

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

如果某个后台服务需要额外公共能力，可以继承 `ApiResource`：

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

也可以直接创建独立实例：

```ts
new ApiResource()
```

## 多服务域

多个后台服务可以分别创建 Resource：

```ts
export const createSystemApi =
  ApiResource.factory({
    serverUrl: '/system-api',
  })

export const createWorkflowApi =
  ApiResource.factory({
    serverUrl: '/workflow-api',
  })
```

然后创建业务 Api：

```ts
const userApi = createSystemApi('user', {
  list() {
    return this.get('list')
  },
})

const taskApi = createWorkflowApi('task', {
  pending() {
    return this.get('pending')
  },
})
```

对应：

```text
/system-api/user/list
/workflow-api/task/pending
```
