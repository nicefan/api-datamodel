# api-datamodel

面向业务 API 建模的 TypeScript 请求模型。

`api-datamodel` 在 Fetch、Axios、UniApp 等请求实现之上建立稳定的 Service 和业务 API，让页面只依赖 `userApi`、`orderApi` 等业务能力，而不是散落的 URL 与请求细节。

## 核心价值

- 按业务模块组织接口，统一管理服务地址和请求路径。
- 集中处理默认配置、鉴权、响应转换、Loading、消息、错误和取消。
- 通过适配器接入标准 Fetch、UniApp、Taro 或自定义请求库。
- 已有 OpenAPI 时，可用附属 Codegen 工具生成类型和相同模型的业务 API。

```text
Backend API → Service → Business API → 业务代码
```

## 安装

```bash
pnpm add api-datamodel axios
```

Axios 由业务项目自行安装。如果运行环境支持 Fetch，也可以只安装 `api-datamodel` 并使用内置 `fetchAdapter`。运行环境需要 Node.js 18.17 或更高版本。

## 快速开始

创建 Service：

```ts
// src/api/dataModel.ts
import axios from 'axios'
import { createService } from 'api-datamodel'

export const service = createService({
  adapter: axios,
  serverUrl: '/api',
})
```

定义业务 API：

```ts
// src/api/user.ts
import { service } from './dataModel'

interface User {
  id: number
  name: string
}

interface UserQuery {
  keyword?: string
  page: number
}

export const userApi = service.createApi('user', {
  list(query: UserQuery) {
    return this.$http.get<User[]>('list', query)
  },
})
```

在业务代码中调用：

```ts
const users = await userApi.list({ page: 1 })
```

此请求地址为 `/api/user/list`。路径、响应、反馈和扩展能力的完整说明请阅读 [使用手册](https://nicefan.github.io/api-datamodel/guide/introduction)。

## 主要能力

- `createService()` 与 `service.createApi()` 建立业务 API。
- `service.with()` 派生同一套规则下的服务前缀。
- `defineConfig()`、请求拦截器和响应转换统一请求环境。
- 全局 Hooks 管理 Loading、错误和批次消息。
- 标准 `AbortSignal` 支持单请求取消和全局活动请求中止。
- `Resource` 提供上传、下载，并可扩展公共请求能力。
- `fetchAdapter`、`buildAdapter` 或自定义适配器接入不同平台。

## API Codegen

Codegen 将 Swagger/OpenAPI 转换为 TypeScript 类型和业务 API，生成结果继续使用已配置的 Service：

```text
OpenAPI → API Codegen → TypeScript Types + Business APIs
```

```bash
api-datamodel-codegen sys
```

配置、路径映射、方法与类型规则见 [API Codegen 文档](https://nicefan.github.io/api-datamodel/codegen/)。生成目录是 OpenAPI 文档的投影，业务扩展应放在生成目录之外。

## 文档

- [介绍](https://nicefan.github.io/api-datamodel/guide/introduction)
- [快速开始](https://nicefan.github.io/api-datamodel/guide/getting-started)
- [API 建模](https://nicefan.github.io/api-datamodel/guide/api-modeling)
- [请求处理](https://nicefan.github.io/api-datamodel/guide/request)
- [请求适配器](https://nicefan.github.io/api-datamodel/guide/adapter)
- [请求扩展](https://nicefan.github.io/api-datamodel/guide/extensions)
- [API Codegen](https://nicefan.github.io/api-datamodel/codegen/)
- [Codegen 配置](https://nicefan.github.io/api-datamodel/codegen/config)
- [后端开发约定](https://nicefan.github.io/api-datamodel/codegen/backend-conventions)

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

公开 API 的签名和行为已经按职责整合到使用手册对应章节，不再单独维护重复的 API Reference。
