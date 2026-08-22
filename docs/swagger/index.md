# API Codegen

API Codegen 是 `api-datamodel` 的自动化生成工具，用于将 Swagger / OpenAPI 文档转换为 DataModel 可直接使用的业务 API 模块。

它负责生成：

- TypeScript 数据类型
- Resource 请求代码
- 业务 Api 模块
- 模块导出文件

生成结果遵循：

```text
Swagger / OpenAPI
        ↓
   API Codegen
        ↓
 Resource + Api
        ↓
 业务代码调用
```

## 设计目标

API Codegen 不是简单生成请求方法，而是将后台接口文档转换成 DataModel 的业务资源模型。

生成后的业务代码无需关心：

- 服务地址
- 网关前缀
- 请求配置
- 鉴权处理
- 返回结构转换

这些能力由 Resource 统一管理。

## Swagger 编写规范

为了保证生成结果稳定，建议后台接口遵循以下规则。

## 路径与业务模块

接口路径的第一个有效路径段会作为业务资源模块。

例如：

```text
/user/list
```

生成：

```ts
userApi.list()
```

路径结构：

```text
/user/list
 │    │
 │    └── Api 方法
 │
 └──── Resource / Api 模块
```

建议：

- 同一业务模块使用统一路径前缀。
- 不要在 Swagger 路径中重复网关地址。
- 网关前缀应该交给 Resource 配置。

例如：

```text
推荐：
/user/list

不推荐：
/api/v1/user/list
```

如果 Swagger 文档已经包含网关路径，需要通过 Resource 的 `rootPathSource` 配置处理。

## tags 规则

`tags[0]` 会参与接口模块分组。

建议：

```yaml
tags:
  - User
```

与路径保持一致：

```text
/user
User
```

这样生成后的 API 模块更加清晰。

## operationId

`operationId` 会作为生成后的 API 方法名。

要求：

- 必填
- 唯一
- 使用合法 TypeScript 方法名
- 能表达业务含义

例如：

```yaml
operationId: getUser
```

生成：

```ts
userApi.getUser()
```

## 参数生成规则

| Swagger 定义 | 生成结果 |
| --- | --- |
| path 参数 | 方法独立参数 |
| query 参数 | 查询对象参数 |
| requestBody | 请求数据参数 |
| header 参数 | Resource 或请求拦截器处理 |

例如：

```yaml
/user/{id}
```

生成：

```ts
getUser(id: number)
```

请求体：

```yaml
requestBody:
  required: true
```

生成：

```ts
saveUser(data: SaveUserRequest)
```

## 返回类型

接口返回模型来自 Swagger 的 `components.schemas`。

例如：

```yaml
schema:
  $ref: '#/components/schemas/User'
```

生成：

```ts
Promise<User>
```

如果后台统一返回包装结构，例如：

```text
AjaxResult<User>
```

Codegen 会根据响应模型配置提取业务数据类型。

## HTTP 方法映射

生成规则：

| HTTP | DataModel |
| --- | --- |
| GET | `$http.get` |
| POST | `$http.post` |
| PUT | `$http.put` |
| DELETE | `$http.delete` |

## 特殊接口处理

### 下载接口

如果接口没有业务返回值，生成器可能判断为文件下载接口。

因此普通业务接口不要使用无返回值的 `204` 响应。

### 上传接口

`multipart/form-data` 不会自动转换为 `upload()`。

文件上传建议：

```ts
this.$http.upload()
```

或者通过自定义模板扩展生成规则。

## 配置文件

创建：

```text
api-datamodel.config.mjs
```

示例：

```js
export default {
  output: 'src/api',

  httpPath: '@/api/dataModel',
  httpModule: 'createApi',

  generator: {
    cleanOutput: true,
    modular: true,
    routeTypes: true,
  },

  apis: {
    sys: {
      description: '系统管理',
      url: 'http://127.0.0.1:8080/v3/api-docs/sys',
      folder: 'sys',
    },
  },
}
```

## 多接口文档

多个后台服务可以分别配置：

```js
apis: {
  sys: {
    url: 'xxx/sys',
    folder: 'sys',
  },

  workflow: {
    url: 'xxx/workflow',
    folder: 'workflow',
  },
}
```

生成：

```text
src/api/
├─ sys/
├─ workflow/
└─ dataModel.ts
```

## 生成命令

package.json：

```json
{
  "scripts": {
    "genApi": "api-datamodel-swagger",
    "genApi:sys": "api-datamodel-swagger sys"
  }
}
```

执行：

```bash
pnpm genApi

pnpm genApi:sys
```

查看帮助：

```bash
npx api-datamodel-swagger --help
```

## 生成目录规范

推荐：

```text
src/api/
├─ sys/
│  ├─ User.ts
│  └─ index.ts
├─ workflow/
└─ dataModel.ts
```

生成目录只保存自动生成内容。

业务扩展建议：

- 新建独立业务文件
- 组合生成的 Api
- 不直接修改生成文件

## 注意事项

- `cleanOutput` 会清理输出目录，请确认目录只包含生成文件。
- Swagger 中保持稳定的路径、Tag 和 operationId，避免生成结果频繁变化。
- Resource 配置属于运行时服务规则，不建议写入 Swagger。
