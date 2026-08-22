# Resource

Resource 是 DataModel 中的服务资源层，建立在 `Http` 之上。

它负责描述一个后台服务的公共访问规则，将后台接口相关的配置从业务 Api 中分离。

Resource 主要负责：

- 服务地址管理
- 网关路径管理
- 默认请求配置
- 鉴权信息
- 请求拦截
- 返回数据转换
- 服务级公共请求能力扩展

例如：

```text
/api/user/list
```

其中：

```text
/api
```

通常表示后台服务或网关前缀，由 Resource 管理。

```text
/user
```

表示业务模块，由 Api 描述。

```text
/list
```

表示具体业务操作。

最终业务代码只关注：

```ts
userApi.list()
```

而不需要关心服务地址、Token、响应格式等请求细节。

## 创建 Resource

通常通过 `serviceInit` 创建默认 Resource 工厂：

```ts
export const createApi = serviceInit({
  adapter,
  serverUrl: '/api',
})
```

然后创建业务 Api：

```ts
export const userApi = createApi('user', {
  list() {
    return this.get('list')
  },
})
```

请求路径：

```text
/api/user/list
```

## Resource 配置

常用配置：

| 配置 | 说明 |
| --- | --- |
| `serverUrl` | 服务地址或网关前缀 |
| `rootPath` | Resource 基础路径 |
| `defRequestConfig` | 默认请求配置 |
| `requestInterceptors` | 请求拦截处理 |
| `transformResponse` | 后端返回数据转换 |

例如统一处理 Token：

```ts
requestInterceptors(config) {
  config.headers = {
    ...config.headers,
    Authorization: token,
  }

  return config
}
```

统一转换后端响应：

```ts
transformResponse(result) {
  return {
    code: result.code,
    message: result.message,
    data: result.data,
    success: result.code === 200,
  }
}
```

## Resource 与 Api 的关系

Resource 负责：

```text
这个服务怎么访问
```

Api 负责：

```text
这个业务模块有哪些能力
```

例如：

```text
Resource
  /api

Api
  user

Method
  list
```

对应：

```text
/api/user/list
```

## 默认扩展能力

`ApiResource` 在 `Http` 基础上提供服务级扩展方法。

默认包含：

```ts
upload()
downloadFile()
```

例如：

```ts
await userApi.upload(
  'avatar',
  formData,
)
```

下载文件：

```ts
const {
  filename,
  data,
} = await userApi.downloadFile('export')
```

这些能力属于 Resource 层，而不是某个具体业务 Api。

## 自定义 Resource

如果某个后台服务存在公共业务请求，可以继承 `ApiResource` 扩展。

例如增加统一导出能力：

```ts
import {
  ApiResource,
} from 'api-datamodel'

class CustomResource extends ApiResource {
  exportFile(path: string) {
    return this.get(path, undefined, {
      responseType: 'blob',
    })
  }
}
```

之后所有基于该 Resource 创建的 Api 都拥有该能力。

也可以直接创建 Resource 实例：

```ts
new ApiResource()
```

## 多服务域

一个前端项目可能同时访问多个后台服务：

- 系统服务
- 工作流服务
- 文件服务
- 业务服务

不同服务可以拥有独立 Resource：

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

创建业务 Api：

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

业务代码无需关心接口属于哪个后台服务。