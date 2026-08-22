# API Reference

## DataModel

核心 API 分层模型。

主要组成：

- `Http`：请求处理层。
- `ApiResource`：服务资源层。
- `serviceInit`：创建业务 API 工厂。
- `defineConfig`：定义 Resource 配置。
- `buildAdapter`：适配不同请求环境。

## Http

提供基础请求能力：

- `request`
- `get`
- `post`
- `put`
- `delete`
- `abort`
- `upload`
- `downloadFile`

## Resource

Resource 用于描述后台服务规则：

- 服务地址
- 请求配置
- 鉴权
- 请求拦截
- 返回数据转换
- 服务级扩展能力

## Api

业务模块 API 由 Resource 创建：

```ts
userApi.list()
userApi.save(data)
```

业务代码只关注业务方法，不直接处理请求细节。

## CacheResult

独立请求缓存工具：

- `createCache`
- `CacheResult`
- `createCacheStore`

支持：

- 请求复用
- reload
- 结果映射
- 字典转换

## API Codegen

根据 Swagger/OpenAPI 生成 DataModel 业务 API。

生成内容包括：

- 类型定义
- Resource 方法
- Api 模块
- index 导出
