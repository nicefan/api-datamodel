# DataModel

DataModel 是 `api-datamodel` 的核心，用于把请求处理、后台服务控制与业务 Api 描述分层。

## Adapter

Adapter 是实际发送请求的外部实现。DataModel 不绑定具体请求库，只要求 Adapter 接收请求配置并返回 Promise。

```ts
const config = defineConfig({
  adapter: axios,
})
```

UniApp、Taro 等平台可以通过 `buildAdapter` 接入。

## Http

`Http` 是通用请求处理层，负责：

- `request`、`get`、`post`、`put`、`delete`
- 请求配置合并
- 请求取消
- 请求状态与消息处理
- Adapter 调用
- 跨平台请求衔接

也可以直接单独使用 `Http`。

## Resource

Resource 建立在 `Http` 之上，用于描述一个后台服务，通常处理：

- `serverUrl` / `rootPath`
- 默认请求配置
- 请求拦截与鉴权
- 后台返回数据转换
- 服务级公共请求能力

普通项目通常只需要一个默认 Resource。不同后台服务存在独立地址、鉴权或返回结构时，再分别创建 Resource。

## Api

Api 描述具体业务模块以及该模块可执行的业务操作。

```ts
userApi.list()
userApi.getInfo(id)
userApi.save(data)
```

Api 不需要重复处理服务地址、鉴权和返回数据规则，这些由 Resource 与 Http 统一处理。

## 路径分层

以 `/api/user/list` 为例：

- `/api`：Resource，对应后台服务或网关前缀。
- `/user`：Api，对应用户管理业务模块。
- `/list`：Api 模块中的具体接口。

这种分层让业务代码最终只依赖 `userApi.list()` 这样的业务描述。
