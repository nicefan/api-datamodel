# api-datamodel 业务开发指南

本文档面向使用 `api-datamodel` 的业务项目及 AI 编码助手。开始修改接口调用、请求反馈、Codegen 配置或后端接口前，应先结合业务项目的请求初始化代码阅读本文档；项目约定与通用说明不一致时，以项目约定为准。

## 开始业务开发前

先确认以下内容：

1. 查看业务项目实际安装的 `api-datamodel` 版本，不根据旧项目示例猜测 API。
2. 找到项目创建 Service、配置 `setRequestHooks()` 和导出 `createApi` 的入口。
3. 找到 `api-datamodel.config.*`、生成命令和生成目录。
4. 生成目录只由 Codegen 更新，不直接修改生成文件来绕过接口文档问题。

业务项目的请求初始化代码决定后台地址、鉴权、签名、响应转换和界面消息展示方式。本文档说明库的通用行为，不替代项目自身的这些配置。

## 在业务代码中调用接口

业务页面应优先导入已有的生成 API：

```ts
import { userApi } from '@/api/sys'

const users = await userApi.list({ keyword: '张三' })
```

不要在页面中重复拼接接口路径、创建新的 Axios 实例或复制生成方法。需要新增或调整接口时，先修正后端 OpenAPI，再重新生成。

只有文档无法表达的业务扩展才放在生成目录之外，并复用项目已有的 `createApi`：

```ts
import { createApi } from '@/api/dataModel'

export const reportApi = createApi('report', {
  publish(id: string, config?: RequestConfig) {
    return this.$http.post<void>(`${id}/publish`, undefined, config)
  },
})
```

### 请求参数位置

```ts
$http.get<T>(path, query?, config?)
$http.delete<T>(path, query?, config?)
$http.post<T>(path, body?, config?)
$http.put<T>(path, body?, config?)
```

- GET、DELETE 的第二个参数是 URL 查询参数。
- POST、PUT 的第二个参数是请求体。
- PATCH 等其他方法通过 `$http.request()` 的 `method`、`params` 和 `data` 明确传递。

### 请求地址

最终地址按照以下顺序组合：

```text
baseUrl + basePath + modulePath + requestPath
```

- `baseUrl` 表示当前环境的服务器或代理地址。
- `basePath` 表示可复用的服务基础路径。
- `modulePath` 表示业务模块。
- `requestPath` 表示模块内的接口路径。

业务路径建议不带前后 `/`。不同后台地址、鉴权或响应规则应创建不同 Service；同一规则只改变部分配置时使用 `service.with()`。

## 响应处理

项目可通过 `transformResponse()` 把后台统一响应转换成：

```ts
{
  code: number
  message: string
  data: unknown
  success: boolean
}
```

- `success: true` 时，业务方法返回 `data`。
- `success: false` 时，Promise 拒绝并进入全局错误处理。
- 响应中没有 `success` 和 `code` 时，直接返回 Adapter 响应的 `data`。
- `rawResponse: true` 时跳过业务响应转换和消息收集，直接返回 Adapter 原始响应。
- 未显式配置 `rawResponse` 时，非 JSON 响应默认返回原始响应。

不要在页面中再次解包项目已经通过 `transformResponse()` 处理过的统一响应。

## Loading、消息和错误

`setRequestHooks()` 是全局配置，应在应用请求初始化入口设置一次，不在页面或单个 API 中重复设置：

```ts
setRequestHooks({
  showLoading() {
    // 打开全局 Loading
  },
  interceptError(error, { abortAll }) {
    // 处理登录失效等系统错误
  },
  complete({ errors, successes }) {
    // 关闭 Loading，并统一展示本批请求消息
  },
})
```

### 请求批次

- 普通请求持续超过 200ms 时调用一次 `showLoading()`。
- 同期请求会归入同一反馈批次，不会为每个请求分别开关 Loading。
- 同一批请求全部结束后调用一次 `complete()`，同时返回错误和成功消息。
- Hooks 自身抛出的错误不会改变原请求结果。

页面不应为普通请求重复实现全局 Loading，也不应在 `catch` 中再次展示已经由全局 Hooks 处理的同一错误。

### `messageMode`

`messageMode` 随错误传给 `interceptError()` 和 `complete()`，具体展示方式由业务项目实现：

```ts
await userApi.save(data, { messageMode: 'modal' })
await userApi.list(query, { messageMode: 'none' })
```

- `message`：通常使用普通消息提示。
- `modal`：通常使用弹窗提示。
- `none`：项目的消息 Hook 应不展示该错误。

`messageMode` 只描述展示意图，不会跳过请求、错误拦截或 Promise 拒绝。

### `silent`

轮询、预加载或不需要界面反馈的请求可配置：

```ts
await userApi.list(query, { silent: true })
```

静默请求：

- 不触发 Loading；
- 不进入成功或错误消息数组；
- 非取消错误仍调用 `interceptError()`；
- 仍参与全局活动请求登记，也会被 `abortAll()` 中止。

不要用 `silent` 隐藏本应处理的业务错误。

### 手动成功消息

需要使用更准确的业务文案时，在请求成功后设置：

```ts
await userApi.save(data)
userApi.$http.setMessage('保存成功')
```

第一次手动成功消息会清除当前批次此前收集的后台成功消息；之后的后台成功消息不再加入该批次，后续手动成功消息仍会保留。错误消息不会被清除。

如果后台消息已经准确，不要再设置相同的手动消息。

### 错误和取消

- 非取消错误会立即进入 `interceptError()`，并在非静默请求中加入错误消息数组。
- 登录失效等系统级错误可以在 `interceptError()` 中调用 `abortAll()`。
- 单个请求取消使用标准 `AbortSignal`。
- 取消仍会使 Promise 拒绝，但不调用 `interceptError()`，也不收集成功或错误消息。

## Codegen 使用

推荐在项目根目录创建 `api-datamodel.config.ts`：

```ts
import { defineConfig } from 'api-datamodel/codegen'

export default defineConfig({
  outputDir: 'src/api',
  importStatement: "import { createApi } from '@/api/dataModel'",
  responseSchema: {
    namePrefix: 'AjaxResult',
    dataField: 'data',
  },
  apis: {
    sys: {
      label: '系统管理',
      url: 'https://example.com/v3/api-docs/系统管理',
      outputFolder: 'sys',
    },
  },
})
```

### 选择工厂导入或 Service 派生

`importStatement` 会原样写入生成代码，仅支持单个默认导入或单成员具名导入。导入项的含义由 `service` 决定：

| 场景 | `importStatement` 导入什么 | 是否配置 `service` | 生成结果 |
| --- | --- | --- | --- |
| 直接使用项目已有工厂 | `createApi` | 否 | 生成模块直接调用，不生成 `resource.ts` |
| 接口组需要固定 `basePath` | Service | 是 | 生成 `resource.ts`，调用 `service.with({ basePath }).createApi` |

直接导入工厂：

```ts
importStatement: "import { createApi } from '@/api/dataModel'"
```

导入 Service：

```ts
importStatement: "import { service } from '@/api/dataModel'",
service: {
  basePath: 'system',
  pathInDocument: false,
},
```

`pathInDocument: true` 表示文档路径已包含 `basePath`，提取模块名和生成路径时先移除该前缀；否则保持默认 `false`。`apis` 数量不影响模式选择。

- `responseSchema` 必须与实际 OpenAPI 响应 Schema 命名及数据字段一致。
- `duplicateMethodStrategy: 'error'` 适合要求重名时立即停止的项目。

前后端同步开发时，可通过命令参数临时使用开发环境文档：

```bash
api-datamodel-codegen <文档地址> <outputFolder>
```

生成前应确认目标目录是否存在未提交改动。启用 `cleanOutput` 后，所选服务目录会被重新生成；生成完成后只审查和提交生成差异。

## 后端 OpenAPI 约定

Codegen 以最终 OpenAPI 文档为准，不以 Controller 注解表面写法为准。前后端同步开发时应检查实际 `/v3/api-docs` 输出。

### 路径和模块

- Controller 一级路径应表示稳定业务模块，例如 `/user`、`/order`。
- 网关、环境和版本前缀不要混入业务模块名；文档确实包含固定前缀时，前端 Codegen 应对应配置 `service.basePath` 和 `pathInDocument`。
- 方法路径应稳定表达资源或动作，例如 `/list`、`/{id}`、`/{id}/status`。

### `operationId` 和 Tag

- 每个接口应提供明确、稳定且尽量全局唯一的 `operationId`，它会成为生成方法名。
- 同一业务模块使用一致的 Tag，并让 Tag 与一级业务路径表达相同归属。
- 不依赖生成器自动添加数字后缀解决重名。

### 参数

- Path 参数名称必须与路径占位符一致，并显式声明 `in: path`、类型和必填性。
- Query 参数应明确声明 `in: query`；复杂查询使用字段稳定的 DTO。
- JSON 请求体使用明确 DTO，不使用无约束的 `Object` 或原始 `Map`。
- 参数位置或类型缺失会使生成器错误区分路径、查询参数和请求体，生成后必须核对方法签名与请求配置。

### 响应

- 普通业务接口使用明确 DTO 和统一响应包装，并保证泛型在最终 Schema 中展开。
- Controller 声明类型必须与真实返回结构一致。
- 不返回无 Schema 的 `Object`、原始 `Map` 或动态结构。
- 普通成功响应不能省略 Schema；成功响应被解析为 `void` 时，当前 Codegen 可能将其识别为下载。
- 上传接口应明确声明 `multipart/form-data` 和二进制文件字段。
- 下载接口应声明正确媒体类型和 `Content-Disposition`，生成后仍需核对请求方法。

## 业务 AI 自检

完成接口相关任务前确认：

- 是否复用了已有生成 API 和项目 Service；
- 是否避免直接修改生成目录；
- Path、Query 和 Body 参数位置是否正确；
- 是否避免重复 Loading 和重复错误提示；
- `silent`、`messageMode` 和手动成功消息是否符合业务意图；
- 是否保留登录失效、鉴权、签名和全局中止逻辑；
- 后端修改是否在最终 OpenAPI 中产生稳定的路径、方法名、参数和响应 Schema；
- 临时联调是否只通过命令传入地址，没有污染稳定配置。
