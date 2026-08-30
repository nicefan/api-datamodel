# 运行时模型

运行时按职责分为请求适配、请求配置、Service、业务 API 和请求实例五层。

```text
RequestAdapter
      ↓
 HttpOptions
      ↓
   Service ── with() ── 派生 Service
      ↓
 createApi(modulePath, methods)
      ↓
 API 实例 ── $http ── Resource 实例
```

## RequestAdapter

适配器负责实际发送请求，接收 `RequestConfig` 并返回 Promise。内置 `fetchAdapter` 适合标准 Fetch 环境，`buildAdapter` 用于 UniApp、Taro 一类提供 `request`、`uploadFile` 和 `downloadFile` 的平台对象。

适配器只处理平台通信；鉴权、默认配置、响应转换和业务路径由运行时其他层负责。

## HttpOptions

`HttpOptions` 描述一套请求规则：

- `adapter`：必填的请求适配器。
- `serverUrl`：服务器地址或代理前缀。
- `rootPath`：服务内的请求前缀。
- `defRequestConfig`：默认请求配置。
- `requestInterceptors`：请求发送前的同步处理。
- `transformResponse`：将后端响应转换成统一业务结构。

`defineConfig()` 原样返回配置，并提供 TypeScript 类型约束。

## Service

`createService(options)` 创建 Service，等价于 `Resource.createService(options)`。Service 提供：

- `http`：不包含模块路径的 Resource 实例，适合服务级请求。
- `createApi()`：创建业务 API 实例。
- `with()`：浅合并配置并创建独立的派生 Service。

```ts
const service = createService(defaultHttpOptions)
const v2Service = service.with({ rootPath: 'v2' })
```

`with()` 不修改来源 Service。每次派生都直接基于创建 Service 时的 Resource 类型，不会形成逐层继承链。

## 业务 API 与 $http

```ts
const userApi = service.createApi('user', {
  list() {
    return this.$http.get<User[]>('list')
  },
})
```

传入对象的成员会浅混入一个新对象，函数绑定到该对象。其原型只提供不可枚举、不可改写的 `$http`，指向当前 API 独立的 Resource 实例。

业务模块之间不共享 `$http` 实例，但共享所属 Service 的静态配置。`modulePath` 只用于构造请求基础地址，不保存在 Service 的公共上下文中。

## 请求生命周期

`setRequestHooks()` 设置全局请求 Hook：

```ts
setRequestHooks({
  showLoading() {},
  interceptError(error, { abortAll }) {},
  complete({ errors, successes }) {},
})
```

- 普通请求超过 200ms 后触发 `showLoading`，同批普通请求全部完成后调用 `complete`。
- `silent: true` 不参与 Loading 和消息聚合，但仍参与 `interceptError`、活动请求登记和 `abortAll()`。
- 所有取消都不进入 `interceptError`，也不进入消息聚合。
- `setRequestHooks()` 是全局配置；再次调用会用新对象替换当前 Hook 配置。

## 消息聚合

成功响应中的消息会进入 `successes`，业务方法也可调用 `$http.setMessage()` 写入手动成功消息：

```ts
return this.$http.post('save', data).then((result) => {
  this.$http.setMessage('保存成功')
  return result
})
```

第一次写入手动成功消息时，会清除本批已收集的后端成功消息，之后到达的后端成功消息也会忽略。错误消息始终全部收集，不受手动成功消息影响。消息按后收到的排在前面。

## 原始响应

`rawResponse: true` 直接返回适配器响应，跳过响应转换和业务成功判断。未设置时，非 JSON 的 `responseType` 自动返回原始响应；显式设置为 `false` 可强制执行业务响应处理。
