# api-datamodel AI 指南

本文档面向在业务项目中使用或维护 `api-datamodel` 的 AI 编码助手。用户用法以 `docs` 手册和当前类型声明为准，不要从旧示例推断 API。

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
Business API
       └─ $http → 独立 Resource 实例
```

- 顶层 `createService(options)` 等价于 `Resource.createService(options)`。
- Service 保存一套服务配置并创建业务 API。
- 每个 API 拥有独立 `$http`，同一 Service 下的实例共享配置。
- 业务对象只包含业务成员，原型层仅提供只读 `$http`。

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

公开类型包括 `Service`、`RequestHooks`、`RequestBatchResult`，以及全局声明的 `HttpOptions`、`RequestConfig`、`RequestAdapter` 和消息类型。

## AI 使用约束

- 业务接口优先通过 `service.createApi(modulePath, methods)` 定义。
- 业务方法内部通过 `this.$http` 调用底层请求，不让 URL 和适配器细节进入页面。
- 请求地址按 `baseUrl + basePath + modulePath + requestPath` 组合，业务路径段建议不带前后 `/`。
- 不同后台地址、鉴权、响应结构或请求规则应创建不同 Service；同一规则只改变部分配置时使用 `service.with()`。
- 单请求取消使用标准 `AbortSignal`，不要引入私有取消协议。
- 普通业务扩展放在业务 API 中；只有公共请求能力才扩展 `Resource`。
- 不要直接修改 Codegen 输出目录，业务扩展应放在生成目录之外。
- 不要复制手册中的完整配置或行为说明到本文件；需要细节时链接正式文档。

## Codegen 原则

- Codegen 只把 OpenAPI 映射为既有 Service/业务 API 模型，不建立第二套运行时。
- `importStatement` 导入工厂方法；配置 `service` 时则导入 Service 并派生工厂方法。
- 配置 `basePath` 时生成 `service.with({ basePath }).createApi`，不会修改原 Service。
- GET、POST、PUT、DELETE 使用快捷方法，其他 HTTP 方法使用 `$http.request()`。
- `void` 成功响应会被当前模板识别为下载；普通业务接口必须声明明确响应 Schema。
- `multipart/form-data` 当前不会自动生成 `$http.upload()`。
- 重名策略仅可为 `strip`、`keep-suffix` 或 `error`。

## 维护实现时必须保持的不变量

- `Resource` 保持为 `Http` 的子类，顶层 `createService()` 使用 `Resource.createService()`。
- `Http.createService()` 保持为静态 Service 工厂，自定义 Http/Resource 子类能继承该能力和类型。
- Service 配置保存在动态子类的静态 `defaultOptions` 中；`with()` 每次从最初的 Http/Resource 类型派生。
- API 原型层只提供不可枚举、不可配置、不可写的 `$http`，业务成员混入 API 对象自身。
- 不同 API 的 `$http` 实例保持隔离。
- RequestManager 统一管理活动请求、反馈批次、Loading、消息和全局中止。
- `silent` 不参与反馈批次，但仍参与错误拦截和全局活动请求。
- 所有取消都不进入错误拦截或消息收集。
- 首次手动成功消息清除后端成功消息，后续后端成功消息忽略；错误消息独立保留。

## 正式文档索引

- [介绍](./docs/guide/introduction.md)
- [API 建模](./docs/guide/api-modeling.md)
- [请求处理](./docs/guide/request.md)
- [请求适配器](./docs/guide/adapter.md)
- [请求扩展](./docs/guide/extensions.md)
- [API Codegen](./docs/codegen/index.md)
- [Codegen 配置](./docs/codegen/config.md)
- [后端开发约定](./docs/codegen/backend-conventions.md)

## 验证命令

```bash
pnpm run build
node --test test/regressions.test.js test/swagger-config.test.js
```

修改 runtime 时至少验证构建和 runtime 回归；修改 Codegen 配置、模板或生成逻辑时同时验证 Codegen 测试。仅修改文档时执行 `cd docs && pnpm build`。
