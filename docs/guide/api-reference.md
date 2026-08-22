# API Reference

本文档用于快速了解 `api-datamodel` 的公共能力和各层职责。

`api-datamodel` 是一个轻量级 TypeScript API 分层管理库，核心通过：

```text
Adapter → Http → Resource → Api
```

将请求实现、后台服务配置和业务接口描述分离。

项目主要包含：

- **DataModel**：核心 API 分层模型。
- **CacheResult**：独立的请求缓存管理工具。
- **API Codegen**：基于 Swagger / OpenAPI 自动生成 DataModel 业务 API。

---

# DataModel

DataModel 的目标不是替代 Axios、fetch 等请求库，而是在请求能力之上建立稳定的业务 API 层。

## Adapter

Adapter 负责实际发送请求。

DataModel 不绑定具体请求实现，可以接入：

- Axios
- fetch
- UniApp request
- Taro request
- 自定义请求实现

例如：

```ts
import { fetchAdapter } from 'api-datamodel'

const config = {
  adapter: fetchAdapter,
}
```

Adapter 只关注：

- 如何发送请求
- 如何返回 Promise
- 如何处理平台差异

---

# Http

Http 是通用请求处理层。

负责：

- 请求发送
- 请求配置合并
- 请求拦截
- 请求取消
- Loading / Message 处理
- Adapter 调用
- 跨平台请求衔接

基础方法：

```ts
request()
get()
post()
put()
delete()
```

扩展能力：

```ts
upload()
downloadFile()
abort()
```

Http 可以单独使用：

```ts
import { Http } from 'api-datamodel'
```

---

# Resource

Resource 是 DataModel 的服务资源层。

它描述一个后台服务的公共规则：

- `serverUrl`
- `rootPath`
- 默认请求配置
- Token / Header
- 请求拦截
- 返回数据转换
- 服务级请求扩展

例如：

```text
/api/user/list
```

对应：

```text
/api     Resource 服务入口
/user    Api 业务模块
/list    业务操作
```

Resource 负责把后台服务规则集中管理，业务代码无需关心完整 URL。

## ApiResource

`ApiResource` 是默认 Resource 实现。

它继承 Http，并增加资源级能力：

```ts
upload()
downloadFile()
```

如果某个后台服务有特殊能力，可以继承扩展：

```ts
class CustomResource extends ApiResource {
  exportFile(path: string) {
    return this.get(path)
  }
}
```

---

# Api

Api 是业务模块层。

业务 API 由 Resource 创建：

```ts
const userApi = createApi('user', {
  list() {
    return this.get('list')
  },
})
```

使用：

```ts
await userApi.list()
```

Api 负责描述业务能力：

```text
userApi
 ├─ list
 ├─ getInfo
 ├─ save
 └─ delete
```

不负责：

- 服务地址
- Token
- Header
- 返回结构转换
- 请求生命周期

这些由 Resource 和 Http 统一处理。

---

# 多服务 Resource

一个项目可以拥有多个服务域：

```text
系统服务
    ↓
createSystemApi
    ↓
userApi

工作流服务
    ↓
createWorkflowApi
    ↓
taskApi
```

不同 Resource 可以拥有不同：

- 地址
- 鉴权方式
- Header
- 返回格式
- 超时配置

业务层只使用对应 API：

```ts
userApi.list()
taskApi.pending()
```

---

# $http

业务 API 实例会提供只读 `$http`。

它代表当前 Resource 的底层 Http 实例。

例如业务方法覆盖底层方法名时：

```ts
export const userApi = createApi('user', {
  delete(id) {
    return this.$http.delete(`${id}`)
  },
})
```

原因：

`get`、`post`、`delete`、`request` 等名称同时也是 Http 方法。

通过 `$http` 可以明确调用底层请求能力。

---

# CacheResult

CacheResult 是独立的请求缓存工具。

它可以单独使用，也可以配合 DataModel API。

## 创建缓存

```ts
import { createCache } from 'api-datamodel'

const getUsers = createCache(userApi.list)
```

使用：

```ts
const cache = getUsers({ page: 1 })

const result = await cache.getResult()
```

支持：

- 请求复用
- 参数缓存
- reload
- 结果映射
- 字典转换

## CacheResult API

| 方法 | 说明 |
| --- | --- |
| `getResult()` | 异步获取结果 |
| `result` | 获取当前结果并触发加载 |
| `getMap()` | 获取映射数据 |
| `map` | 当前映射结果 |
| `reload()` | 重新请求 |

---

# API Codegen

API Codegen 用于将 Swagger/OpenAPI 文档转换为 DataModel 业务 API。

生成内容：

- TypeScript 类型
- Resource 请求方法
- Api 业务模块
- index 导出文件

生成流程：

```text
Swagger/OpenAPI
       ↓
 API Codegen
       ↓
Resource + Api
       ↓
业务调用
```

配置示例：

```js
export default {
  output: 'src/api',
  httpPath: '@/api/dataModel',
  httpModule: 'createApi',
}
```

适用于：

- 后端接口数量较多
- Swagger 驱动开发
- 多业务模块项目

生成代码建议视为接口文档的映射，不建议直接修改生成文件。

---

# 公共导出

| API | 说明 |
| --- | --- |
| `Http` | 基础请求处理层 |
| `ApiResource` | 默认 Resource 实现 |
| `defineConfig` | Resource 配置定义 |
| `serviceInit` | 创建业务 API 工厂 |
| `setLoadingServe` | Loading / Message 接入 |
| `buildAdapter` | 平台请求适配 |
| `createCache` | 创建请求缓存 |
| `CacheResult` | 缓存结果管理 |
| `createCacheStore` | 创建缓存空间 |

---

# 设计原则

`api-datamodel` 的核心思想：

```text
请求库负责：如何发送请求

DataModel 负责：如何组织业务 API
```

通过分层，让业务代码只关注：

```ts
userApi.list()
orderApi.save()
taskApi.pending()
```

而请求规则、服务配置和通用能力统一管理。