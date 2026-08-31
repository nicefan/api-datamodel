# 服务前缀与模块路径

请求地址首先可以理解为两部分：

```text
请求地址 = 服务前缀 + 业务相对路径
```

Service 决定请求发往哪个服务，业务 API 决定访问该服务中的哪个模块和方法。

## 简单场景

普通项目只配置 `serverUrl` 即可：

```ts
const service = createService({
  adapter: fetchAdapter,
  serverUrl: '/api',
})

const userApi = service.createApi('user', {
  list() {
    return this.$http.get('list')
  },
})
```

```text
服务前缀：/api
模块前缀：user
方法路径：list
最终地址：/api/user/list
```

对于简单的相对地址，`serverUrl` 和 `rootPath` 都能形成固定前缀，可以只配置其中一个，也可以都不配置。入门示例推荐使用 `serverUrl`，不必同时引入两个概念。

## 完整路径组成

需要区分环境地址和业务服务时，再展开完整结构：

```text
服务前缀
= serverUrl + rootPath

业务相对路径
= modulePath + requestPath
```

因此完整地址是：

```text
serverUrl + rootPath + modulePath + requestPath
```

| 部分 | 配置位置 | 适合表达 |
| --- | --- | --- |
| `serverUrl` | `HttpOptions` | 当前环境或平台的后台地址、代理地址 |
| `rootPath` | `HttpOptions` | 可以跨环境复用的服务前缀 |
| `modulePath` | `service.createApi()` | user、order 等业务模块前缀 |
| `requestPath` | `$http` 请求方法 | list、save、detail 等模块内路径 |

## 多环境和多平台复用

例如 Web 和 App 使用不同地址，但共享 `system` 业务服务：

```ts
const webService = createService({
  adapter: fetchAdapter,
  serverUrl: '/gateway',
  rootPath: 'system',
})

const appService = createService({
  adapter: buildAdapter(uni),
  serverUrl: 'https://example.com/gateway',
  rootPath: 'system',
})
```

两端可以定义相同模块：

```ts
const userApi = service.createApi('user', {
  list() {
    return this.$http.get('list')
  },
})
```

```text
Web：/gateway/system/user/list
App：https://example.com/gateway/system/user/list
```

这里 `serverUrl` 随平台变化，`rootPath + modulePath + requestPath` 保持业务语义稳定。

## 使用 `service.with()` 细分业务服务

同一后台请求规则下，可以派生不同服务前缀：

```ts
const defaultService = createService({
  adapter: fetchAdapter,
  serverUrl: '/gateway',
})

const systemService = defaultService.with({ rootPath: 'system' })
const workflowService = defaultService.with({ rootPath: 'workflow' })
```

```text
/gateway/system/user/list
/gateway/workflow/process/list
```

如果后台地址、鉴权或响应结构也不同，应重新 `createService()`，而不是继续派生。

## 路径规范化

- 空路径段会被忽略；
- 业务路径段两端多余的 `/` 会被清理；
- `serverUrl` 保留协议和域名，只清理末尾 `/`；
- 推荐 `rootPath`、`modulePath`、`requestPath` 不带前后 `/`。

Codegen 如何从 OpenAPI 推导模块和方法路径，见 [生成规则](../codegen/generation-rules)。
