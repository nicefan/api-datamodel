# api-datamodel AI 使用手册

本文档面向在业务项目中使用或维护 `api-datamodel` 的 AI 编码助手。所有代码应以本文档、`README.md` 和当前类型声明为准。

## 核心模型

```text
HttpOptions
    ↓
createService() / Resource.createService()
    ↓
Service
├─ http
├─ with()
└─ createApi()
       ↓
    API 实例
       └─ $http → 独立 Resource 实例
```

- `Http` 负责请求执行、路径拼接、响应处理和 RequestManager 登记。
- `Resource` 继承 `Http`，补充 `upload()` 和 `downloadFile()`。
- `Service` 是闭包创建的普通对象，负责保存服务配置和创建 API 实例。
- 顶层 `createService(options)` 等价于 `Resource.createService(options)`。
- 每个 API 实例拥有独立 `$http`，但同一 Service 创建的实例使用同一份静态默认配置。
- API 业务对象只包含业务扩展成员；其原型层提供只读 `$http`。

## 公开入口

```ts
import {
  Http,
  Resource,
  buildAdapter,
  createService,
  defineConfig,
  fetchAdapter,
  setRequestHooks,
} from 'api-datamodel'
```

主要类型和对象：

```text
HttpOptions
RequestConfig
RequestAdapter
Service
RequestHooks
RequestBatchResult
```

业务配置优先使用 `defineConfig()` 获得 `HttpOptions` 约束和推导，业务方法直接使用全局 `RequestConfig` 类型。

## 创建 Service

```ts
export const defaultHttpOptions = defineConfig({
  adapter: fetchAdapter,
  serverUrl: '/api',
  rootPath: 'v1',
  defRequestConfig: {
    timeout: 30_000,
    headers: { 'content-type': 'application/json' },
  },
  requestInterceptors(config) {
    return {
      ...config,
      headers: {
        ...config.headers,
        Authorization: `Bearer ${getToken()}`,
      },
    }
  },
  transformResponse(result) {
    const { code, message, data } = result
    return {
      code,
      message,
      data,
      success: code === 0 || code === 200,
    }
  },
})

export const service = createService(defaultHttpOptions)
export const createApi = service.createApi
```

`transformResponse()` 应返回：

```ts
{
  code: number
  message: string
  data: Obj
  success: boolean
}
```

`success` 决定业务响应进入成功还是错误流程。

## 路径规则

最终请求地址固定按以下顺序组成：

```text
serverUrl + rootPath + modulePath + requestPath
```

示例：

```text
serverUrl  /api
rootPath   v1
modulePath user
requestPath list
最终地址   /api/v1/user/list
```

各路径段建议不带前后 `/`；运行时会统一清理多余分隔符。

## 创建业务 API

```ts
export const userApi = createApi('user', {
  list(query: UserQuery, config?: RequestConfig) {
    return this.$http.get<User[]>('list', query, config)
  },

  save(data: UserInput, config?: RequestConfig) {
    return this.$http.post<number>('save', data, config).then((id) => {
      this.$http.setMessage('用户保存成功')
      return id
    })
  },
})
```

没有模块路径时：

```ts
const healthApi = service.createApi({
  check(config?: RequestConfig) {
    return this.$http.get('health', undefined, config)
  },
})
```

业务方法通过 `this.$http` 调用请求能力。业务方法可以使用任意名称，即使名称与 `get`、`post`、`delete` 或 `request` 相同，也通过 `$http` 明确调用底层方法。

## Service 派生

```ts
const v2Service = service.with({ rootPath: 'v2' })
```

- `with()` 使用对象浅合并生成新配置。
- 父 Service 不改变。
- 派生 Service 拥有独立 `http`。
- 派生类型直接继承最初创建 Service 的 Http/Resource 类型。

## 单独使用 Http

```ts
const http = new Http({
  adapter: fetchAdapter,
  serverUrl: 'https://example.com',
})

const result = await http.get<Result>('status')
```

## RequestConfig

常用字段：

| 字段 | 语义 |
| --- | --- |
| `headers` | 单次请求头 |
| `params` | URL 查询参数 |
| `data` | 请求体 |
| `timeout` | 超时毫秒数 |
| `signal` | 单请求取消信号 |
| `silent` | 不参与 Loading 和消息聚合，但仍参与错误拦截和全局活动请求登记 |
| `messageMode` | 错误消息模式 |
| `responseType` | `json`、`text` 或 `blob` |
| `rawResponse` | 直接返回适配器原始响应 |

`rawResponse` 规则：

- `true`：跳过统一响应转换，返回适配器响应。
- `false`：执行统一响应处理。
- 未配置：非 JSON 响应自动返回适配器响应。

## 请求 Hooks

```ts
setRequestHooks({
  showLoading() {
    // 打开全局 Loading
  },
  interceptError(error, { abortAll }) {
    if (error.code === '1401') abortAll()
  },
  complete({ errors, successes }) {
    // 关闭 Loading 并处理本批消息
  },
})
```

- Hooks 是全局配置，调用时读取当前配置。
- 普通请求超过 200ms 后触发 `showLoading()`。
- `interceptError()` 在错误到达时立即执行。
- `complete()` 在当前批次结算后调用一次。
- `abortAll()` 中止所有 Service、Resource 和独立 Http 发起的活动请求。

## 消息规则

- 错误消息和成功消息分别收集。
- 新消息使用 `unshift()` 加入，因此最后收到的消息位于数组首位。
- 空消息不收集。
- `$http.setMessage()` 向当前批次写入手动成功消息。
- 第一次手动成功消息会清空已收集的后端成功消息。
- 手动成功消息出现后，后续后端成功消息不再收集。
- 错误消息始终独立收集，不受成功消息优先规则影响。

## 请求取消

单请求取消：

```ts
const controller = new AbortController()
const request = userApi.$http.get('detail', { id: 1 }, { signal: controller.signal })

controller.abort('页面已离开')
await request
```

所有取消都只负责结束请求和注销活动状态，不进入 `interceptError()`，也不进入批次消息。

## 上传与下载

```ts
const fileApi = service.createApi('file', {})

await fileApi.$http.upload('upload', formData)
const { filename, data } = await fileApi.$http.downloadFile('export')
```

UniApp/Taro 类平台：

```ts
const platformService = createService({
  adapter: buildAdapter(uni),
  serverUrl: 'https://example.com/api',
})
```

平台上传成功回调的 `data` 应为合法 JSON 字符串。下载返回值统一为 `{ filename, data }`。

## API Codegen

配置文件示例：

```ts
import defineConfig from 'api-datamodel/codegen/defineConfig.js'

export default defineConfig({
  outputDir: 'src/api',
  service: {
    importPath: '@/api/dataModel',
    importName: 'service',
    rootPath: 'system',
    rootPathSource: 'gateway',
  },
  responseSchema: {
    namePrefix: 'AjaxResult',
    dataField: 'data',
  },
  apis: {
    sys: {
      url: 'http://127.0.0.1:8080/v3/api-docs',
      outputFolder: 'sys',
    },
  },
})
```

生成命令：

```bash
api-datamodel-codegen sys
```

Codegen 规则：

- `service.importPath` 和 `service.importName` 定位已配置的 Service。
- 配置 `rootPath` 时使用 `service.with({ rootPath }).createApi`。
- 每个输出目录生成 `resource.ts` 作为 `createApi` 桥接文件。
- GET、POST、PUT、DELETE 使用 `$http` 快捷方法。
- PATCH、HEAD、OPTIONS 等方法使用 `$http.request()`，并写入实际 HTTP method。
- 生成目录是 OpenAPI 文档的投影，业务扩展代码放在生成目录之外。
- `duplicateMethodStrategy` 可选 `strip`、`keep-suffix` 或 `error`。

## 维护实现时必须保持的关系

- `Resource` 保持为 `Http` 的子类。
- `Http.createService()` 是静态 Service 工厂实现，`Resource` 继承该能力。
- 顶层 `createService()` 使用 `Resource.createService()`。
- Service 配置保存在动态子类的静态 `defaultOptions` 中。
- `with()` 每次从最初的 Http/Resource 类型派生。
- API 对象的原型层只提供 `$http`，业务成员 mixin 到 API 对象自身。
- `$http` 在不同 API 之间保持实例隔离。
- RequestManager 统一管理活动请求、批次、Loading、消息和全局中止。
- 所有取消都基于标准 `AbortSignal` 和 `AbortController`。

## 验证命令

```bash
pnpm run build
node --test test/regressions.test.js test/swagger-config.test.js
```

修改 runtime 时至少验证构建和 runtime 回归；修改 codegen 配置、模板或生成逻辑时同时验证 codegen 测试。
