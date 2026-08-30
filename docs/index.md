---
layout: home

hero:
  name: api-datamodel
  text: TypeScript 业务 API 请求模型
  tagline: 通过 Http、Resource 与 Service 统一路径、请求生命周期和业务 API。
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: API Reference
      link: /guide/api-reference

features:
  - title: Service 建模
    details: 使用一份 HttpOptions 创建 Service，再按 modulePath 生成隔离的业务 API 实例。
  - title: 请求生命周期
    details: 统一管理 Loading、消息批次、错误拦截、标准取消信号和全局活动请求。
  - title: API Codegen
    details: 根据 Swagger / OpenAPI 生成类型安全的业务 API，并直接复用项目中的 Service。
---

## 核心模型

```text
RequestAdapter
      ↓
HttpOptions → Service
                 ├─ http
                 ├─ with()
                 └─ createApi(modulePath, methods)
                              ↓
                           API 实例
                              └─ $http → 独立 Resource 实例
```

- **Http**：执行请求、拼接路径、处理响应并登记请求生命周期。
- **Resource**：继承 Http，补充上传、下载等通用请求能力。
- **Service**：保存服务配置，派生服务前缀并创建业务 API。
- **API 实例**：只暴露业务方法，通过只读 `$http` 调用底层请求。

## 路径模型

所有请求统一按四段组成：

```text
serverUrl + rootPath + modulePath + requestPath
```

例如：

```text
/api + v1 + user + list → /api/v1/user/list
```

业务代码只表达业务能力：

```ts
await userApi.list({ page: 1 })
await userApi.save(data)
```

## 主要能力

### Runtime

- 可替换的请求适配器
- 多 Service 配置隔离
- `service.with()` 浅合并派生
- 独立 `$http` 实例
- Loading 延迟显示与批次完成
- 错误即时拦截与全局中止
- `AbortSignal` 单请求取消

### API Codegen

- OpenAPI 类型生成
- 业务模块和方法生成
- Service 导入与 `rootPath` 派生
- 重名方法诊断
- 原子替换生成目录

从 [快速开始](/guide/getting-started) 创建第一个 Service，或直接查看 [API Reference](/guide/api-reference)。
