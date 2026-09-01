# API Codegen

API Codegen 是 `api-datamodel` 的附属工具，用于将 Swagger/OpenAPI 文档转换成 TypeScript 类型和业务 API。

```text
OpenAPI
   ↓
API Codegen
   ↓
TypeScript Types + Business APIs
```

生成结果仍然使用手册中的 [API 建模](../guide/api-modeling) 模型，不是另一套请求体系。

使用 Codegen 前安装开发依赖，并使用 Node.js 18 或更高版本：

```bash
pnpm add -D inquirer jiti swagger-typescript-api@12.0.4
```

## 使用流程

### 1. 准备 Service

业务项目先导出已经配置好的 Service：

```ts
// src/api/dataModel.ts
import axios from 'axios'
import { createService } from 'api-datamodel'

export const service = createService({
  adapter: axios,
  baseUrl: '/api',
})
```

### 2. 创建配置文件

在项目根目录创建 `api-datamodel.config.ts`：

```ts
import { defineConfig } from 'api-datamodel/codegen'

export default defineConfig({
  outputDir: 'src/api',
  importStatement: "import { createApi } from '@/api/dataModel'",
  responseSchema: {
    namePrefix: 'AjaxResult',
    dataField: 'data',
  },
  apis: {
    sys: {
      url: 'https://example.com/openapi.json',
      outputFolder: 'sys',
    },
  },
})
```

### 3. 执行命令

```bash
api-datamodel-codegen sys
```

也可直接指定远程或本地文档和输出文件夹：

```bash
api-datamodel-codegen ./openapi.json local
api-datamodel-codegen https://example.com/openapi.json --output sys
```

常用选项：

```text
-c, --config <路径>  指定配置文件
-o, --output <目录>  指定输出文件夹
-h, --help           显示帮助
```

### 4. 使用生成 API

默认输出位于 `src/api/<outputFolder>`：

```text
src/api/sys/
├─ data-contracts.ts
├─ <业务模块>.ts
└─ index.ts
```

```ts
import { userApi } from '@/api/sys'

const users = await userApi.listUsers({ page: 1 })
```

生成目录是 OpenAPI 文档的投影，不要在其中手工维护业务扩展。

## 默认生成规则

Codegen 先让 `swagger-typescript-api` 解析文档，再把上游结果转换成已有的 Service 和 Business API 模型。

```text
OpenAPI 路径
    ↓
路径规范化
    ↓
模块与文件
    ↓
方法、参数、返回类型
    ↓
输出文件
```

### 路径到模块

规范路径的第一个业务段成为 `resourceName`，并作为 `createApi(resourceName, ...)` 的 `modulePath`：

```text
/user/list
   ↓
resourceName = user
modulePath   = user
requestPath  = /list
```

模块变量名和文件名通常以第一段为基础。一级资源相同且存在嵌套路由冲突时，生成器会组合第二段的 PascalCase 名称进行区分，例如 `userRoleApi`。

Tag 参与 `swagger-typescript-api` 的上游模块分组，但最终业务资源名仍从规范路径推导。Tag 和路径应表达一致的业务归属。

### 请求路径

每个方法的 `requestPath` 是规范路径移除第一个 `resourceName` 后的部分。Path 参数保留为模板表达式：

```text
OpenAPI:    /user/{id}/roles
modulePath: user
requestPath: /${id}/roles
```

运行时再按照 `baseUrl + basePath + modulePath + requestPath` 组合完整地址。

OpenAPI 路径包含 `basePath` 时，应配置 `pathInDocument: true`，避免生成的模块名和 `modulePath` 带上该基础路径。具体配置见 [配置](./config#pathindocument)。

### 方法名

`operationId` 是业务方法名的主要来源，应合法、稳定且尽量全局唯一。

`swagger-typescript-api` 会为重复 `operationId` 追加 `_2`、`_3` 等数字后缀。Codegen 再根据 `duplicateMethodStrategy` 决定移除、保留或终止生成，详见 [重名策略](./config#重名策略)。

### 参数

- Path 参数生成独立方法参数，并写入请求路径模板；
- Query 参数生成查询对象；
- Request Body 生成数据参数；
- 可选 Body 或字段全部可选的模型默认值为 `{}`；
- 每个方法末尾附加可选的 `config?: RequestConfig`。

具体 TypeScript 参数形状由 OpenAPI Schema 和 `swagger-typescript-api` 的解析结果决定。

### HTTP Method

| OpenAPI Method | 生成调用 |
| --- | --- |
| GET | `$http.get()` |
| POST | `$http.post()` |
| PUT | `$http.put()` |
| DELETE | `$http.delete()` |
| PATCH、HEAD、OPTIONS | `$http.request()`，并显式写入 `method` |

非 GET 快捷方法同时存在 Query 和 Body 时，Body 作为第二个参数，Query 写入单次请求配置的 `params`。

### 返回类型

返回类型来自 OpenAPI `components.schemas` 和成功响应 Schema。

当成功响应类型名称匹配 `responseSchema.namePrefix` 时，生成器读取该类型的 `responseSchema.dataField`，把业务方法返回类型收窄为数据字段类型。例如：

```text
AjaxResultUser
      ↓ data
     User
```

未匹配包装模型或找不到目标字段时，使用完整成功响应类型。配置方式见 [`responseSchema`](./config#responseschema)。

### 模块文件与输出目录

每个 `outputFolder` 独立生成：

- `data-contracts.ts` 等类型文件；
- 按模块生成的业务 API 文件；
- `resource.ts`：配置 `service` 时生成，通过导入的 Service 派生并导出对应 `createApi`；
- `index.ts`：导出输出目录中的所有 TypeScript 模块。

生成器先写入同级临时目录，全部成功后再整体替换正式输出目录；替换失败时尝试恢复旧目录。开启 `cleanOutput` 时，输出子目录只应保存生成内容。

### 当前能力边界

- 成功响应解析为 `void` 时，当前模板会生成 `$http.downloadFile()`，因此普通业务接口不应只声明空响应；
- `multipart/form-data` 当前不会自动生成 `$http.upload()`；
- 不同 OpenAPI 下载声明可能得到不同的上游解析结果，生成后仍需核对下载方法；
- 业务组合和扩展代码应放在生成目录之外，避免下次生成覆盖。

完整配置及其对生成结果的影响见 [配置](./config)，后端接口如何提供稳定文档见 [后端开发约定](./backend-conventions)。
