---
layout: home

hero:
  name: api-datamodel
  text: 将后台接口组织成业务 API
  tagline: 用 Service 统一服务边界、请求规则和类型，让业务代码只面对稳定的业务能力。
  actions:
    - theme: brand
      text: 开始使用
      link: /guide/introduction
    - theme: alt
      text: API Codegen
      link: /codegen/

features:
  - title: 业务 API 建模
    details: 按业务模块组织 userApi、orderApi 等稳定入口，不让 URL 和请求细节散落在页面中。
  - title: 统一请求处理
    details: 集中管理路径、默认配置、响应转换、Loading、消息、错误和取消行为。
  - title: OpenAPI 自动生成
    details: 已有 OpenAPI 时，可用附属 Codegen 工具生成类型和相同模型的业务 API。
---

## 核心模型

```text
Backend API
     ↓
  Service
     ↓
Business API
     ↓
  业务代码
```

Service 定义服务边界，业务 API 表达具体业务能力：

```ts
await userApi.list({ page: 1 })
await orderApi.submit(data)
```

业务代码无需重复拼接地址，也无需为每个页面重复处理相同的请求规则。

## 已有 OpenAPI？

Codegen 是 API 建模的辅助工具，生成的仍然是同一种业务 API：

```text
OpenAPI → API Codegen → TypeScript 类型 + Business API
```

先从 [介绍](/guide/introduction) 理解模型，或在已有 OpenAPI 时查看 [API Codegen](/codegen/)。
