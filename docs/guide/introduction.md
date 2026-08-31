# 介绍

`api-datamodel` 将后台接口组织成稳定、可复用、类型化的业务 API。它不替代 Fetch、Axios 或平台请求库，而是在网络请求之上建立清晰的业务边界。

## 为什么需要 API 建模

直接在页面中调用请求库，往往会让 URL、鉴权、响应判断和错误处理散落在各处：

```text
页面 → URL / fetch / axios / 响应判断
```

API 建模把这些细节收敛到服务和业务模块中：

```text
页面 → userApi / orderApi / fileApi
```

页面只描述“查询用户”或“提交订单”，底层请求规则可以集中维护。

## 基本模型

```text
HttpOptions
     ↓
  Service
     ↓
Business API
```

- `HttpOptions` 定义适配器、服务地址、默认请求配置和响应转换。
- `Service` 保存一组服务规则，并创建业务 API。
- 业务 API 按模块暴露方法，通过 `$http` 使用底层请求能力。

普通使用只需要理解 Service 和业务 API。需要接入网络请求实现时阅读 [请求适配器](./adapter)，需要增加或改变底层请求能力时再阅读 [请求扩展](./extensions)。

## 两种建立 API 的方式

可以手工定义业务 API：

```ts
const userApi = service.createApi('user', {
  list(query: UserQuery) {
    return this.$http.get<User[]>('list', query)
  },
})
```

也可以让 API Codegen 根据 OpenAPI 生成类型和业务 API。两种方式共用同一套 Service 和运行时模型，调用方式没有区别。

下一步：

- [快速开始](./getting-started)
- [API 建模](./api-modeling)
- [API Codegen](../codegen/)
