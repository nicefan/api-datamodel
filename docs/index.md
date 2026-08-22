---
layout: home

hero:
  name: api-datamodel
  text: 轻量级 TypeScript API 分层管理库
  tagline: 通过 Adapter → Http → Resource → Api 分离请求处理、服务资源和业务接口。
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: GitHub
      link: https://github.com/nicefan/api-datamodel

features:
  - title: DataModel
    details: 核心 API 分层模型，将请求处理、后台服务控制和业务 Api 描述分离。
  - title: CacheResult
    details: 独立的请求缓存管理工具，支持结果缓存、重新加载以及记录和字典映射。
  - title: API Codegen
    details: 基于 DataModel 的接口自动化工具，根据 Swagger / OpenAPI 生成业务 Api。
---

## 核心理念

DataModel 将 API 分为四层：

- **Adapter**：连接 Axios、fetch、UniApp、Taro 等实际请求实现。
- **Http**：负责请求发送、配置处理、取消请求以及通用请求能力。
- **Resource**：描述后台服务，管理服务地址、鉴权、拦截和数据转换。
- **Api**：描述具体业务模块和接口方法。

例如：

```text
/api/user/list
```

其中：

- `/api`：Resource，对应后台服务或网关前缀。
- `/user`：Api，对应业务模块。
- `/list`：模块中的具体接口。

最终业务代码只关注业务能力：

```ts
userApi.list()
userApi.save(data)
```

## 三个组成部分

### DataModel

核心 API 分层能力。

用于统一管理：

- 请求实现
- 服务资源
- 业务接口
- 多后台服务

### CacheResult

独立的请求缓存工具。

可以与 DataModel 结合，也可以单独用于任意异步请求：

- 缓存请求结果
- reload 刷新
- 生成记录映射
- 生成字典映射

### API Codegen

DataModel 的自动化生成工具。

根据 Swagger / OpenAPI 文档生成：

- TypeScript 类型
- Api 模块
- Resource 请求代码

