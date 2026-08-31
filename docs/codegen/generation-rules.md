# 生成规则

Codegen 按以下流水线把 OpenAPI 映射为已有业务 API 模型：

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

运行时如何组合路径由 [服务前缀与模块路径](../guide/request-path) 定义；本页只说明生成器如何推导其中的 `modulePath` 和 `requestPath`。

## 路径规范化

默认 `rootPathSource: 'gateway'` 时，OpenAPI 路径保持不变。

`rootPathSource: 'document'` 且配置了 `rootPath` 时，生成器从 OpenAPI 路径开头移除完整 `rootPath`，或能匹配的最长尾部前缀。例如 `rootPath: 'api/v1'` 可以从 `/api/v1/user/list` 移除 `/api/v1`，也可以从 `/v1/user/list` 移除 `/v1`。

## 模块生成规则

规范路径的第一个业务段成为 `resourceName`，并作为 `createApi(resourceName, ...)` 的 `modulePath`：

```text
/user/list
   ↓
resourceName = user
modulePath   = user
requestPath  = /list
```

模块变量名和文件名通常以第一段为基础。一级资源相同且存在嵌套路由冲突时，生成器组合第二段的 PascalCase 名称进行区分，例如 `userRoleApi`。Tag 参与上游模块分组，但最终业务资源名仍从规范路径推导，因此路径结构应保持稳定。

## 请求路径生成规则

每个方法的 `requestPath` 是规范路径移除第一个 `resourceName` 后的部分。路径参数保留为模板表达式，供生成方法参数填入。

```text
OpenAPI: /user/{id}/roles
modulePath: user
requestPath: /${id}/roles
```

运行时再把 Service 路径与这两部分组合，Codegen 不重新定义该规则。

## 方法名称规则

`operationId` 是业务方法名的主要来源，应合法、稳定且唯一。

`swagger-typescript-api` 对重复 `operationId` 追加 `_2`、`_3` 等数字后缀。Codegen 先按移除该后缀后的名称分组，再应用 `duplicateMethodStrategy`：

- `strip`：使用移除后缀的名称并报告错误；
- `keep-suffix`：冲突项保留上游后缀并报告警告；
- `error`：报告冲突并终止生成。

## HTTP 方法映射

| OpenAPI 方法 | 生成调用 |
| --- | --- |
| GET | `$http.get()` |
| POST | `$http.post()` |
| PUT | `$http.put()` |
| DELETE | `$http.delete()` |
| PATCH、HEAD、OPTIONS | `$http.request()`，并显式写入 `method` |

非 GET 快捷方法同时存在 Query 和 Body 时，Body 作为第二个参数，Query 合并到单次请求配置的 `params`。

## 参数生成规则

- Path 参数生成独立方法参数，并写入请求路径模板。
- Query 参数生成查询对象。
- Request Body 生成数据参数；可选 Body 或字段全可选的模型默认值为 `{}`。
- 每个方法末尾附加可选的 `config?: RequestConfig`，调用方可以覆盖单次请求配置。

具体 TypeScript 参数形状由 OpenAPI Schema 和 `swagger-typescript-api` 的解析结果决定。

## 返回类型

类型来源于 OpenAPI `components.schemas` 和成功响应 Schema。

当响应类型名称匹配 `responseSchema.namePrefix` 时，生成器读取该类型的 `responseSchema.dataField`，把方法返回泛型收窄为业务数据字段类型。未匹配时使用完整成功响应类型。

成功响应被解析为 `void` 时，当前模板生成 `$http.downloadFile()`，并保留实际 HTTP method、Body 和 Query 配置。因此普通业务成功响应不应只声明空响应，否则会被识别为下载接口。

`multipart/form-data` 不会自动改为 `$http.upload()`；需要特殊上传语义时，在生成目录之外组合或扩展生成 API。

## 输出文件规则

每个 `outputFolder` 独立生成：

- `data-contracts.ts` 等类型文件；
- 按模块生成的业务 API 文件；
- `resource.ts`：导入已配置 Service，并导出对应 `createApi`；
- `index.ts`：导出输出目录中的所有 TypeScript 模块。

生成器先写入同级临时目录，全部成功后再整体替换正式输出目录；替换失败时尝试恢复旧目录。开启 `cleanOutput` 时，输出子目录应只保存生成内容。
