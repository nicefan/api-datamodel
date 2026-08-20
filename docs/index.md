---
layout: home

hero:
  name: api-datamodel
  text: 轻量级 TypeScript API 分层管理库
  tagline: 用 Adapter → Http → Resource → Api 分离请求处理、服务资源与业务接口描述。
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: GitHub
      link: https://github.com/nicefan/api-datamodel

features:
  - title: DataModel
    details: 核心 API 分层模型。Http 负责请求处理，Resource 负责后台服务规则，Api 描述业务接口。
  - title: CacheResult
    details: 独立的请求缓存管理工具，可缓存异步请求结果并生成记录或字典映射。
  - title: SwaggerGen
    details: 将 DataModel 应用于接口自动化管理，根据 Swagger / OpenAPI 生成类型和业务 Api。
---

## 核心理念

DataModel 将一个 API 请求划分为四层：

- **Adapter**：对接 Axios、UniApp、Taro 或其他请求实现。
- **Http**：负责请求发送、配置合并、取消及通用请求处理。
- **Resource**：描述后台服务，管理服务路径、鉴权、拦截和返回数据转换。
- **Api**：描述具体业务模块及接口方法。

例如 `/api/user/list` 中，`/api` 可以看作 Resource 服务或网关前缀，`/user` 是用户业务模块，`/list` 是模块中的具体接口。

```ts
userApi.list()
userApi.save(data)
userApi.delete(id)
```

业务代码只关注业务能力，不需要重复维护完整请求路径和后台服务规则。
