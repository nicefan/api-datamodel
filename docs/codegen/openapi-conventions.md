# OpenAPI 编写规范

本页面向提供 OpenAPI 文档的后端开发者。目标是让生成的前端业务 API 稳定、可读，并避免人工修正生成文件。

## 路径设计

推荐让第一个业务路径段代表稳定资源，后续路径表达具体操作：

```text
/user/list
/user/{id}
/user/{id}/roles
```

会生成以 `user` 为 `modulePath` 的 `userApi`，方法请求路径分别落在该模块下。不要把易变环境或网关前缀混入业务资源段；这类前缀应与 Codegen 的 `rootPathSource` 配置保持一致。

## `operationId`

每个操作应提供合法、稳定、全局尽量唯一的 `operationId`：

```yaml
operationId: listUsers
```

它会成为业务方法名。不要依赖生成器追加数字后缀来解决重名，也不要把临时版本号随意拼进名称。

## Tag

Tag 用于上游模块分组，建议同一业务资源使用一致 Tag。由于最终模块路径仍按 URL 的第一个业务段推导，Tag 和路径应表达相同的业务归属，避免同一组接口被拆散或发生文件冲突。

## Path 参数

在路径中声明占位符，并在 `parameters` 中使用相同名称、标记为必填：

```yaml
/user/{id}:
  get:
    operationId: getUser
    parameters:
      - in: path
        name: id
        required: true
        schema:
          type: integer
```

会生成独立 `id` 参数，并将其写入请求路径模板。

## Query 参数

筛选、分页和排序字段使用 `in: query`，并提供明确类型与必填性。它们会组成查询对象传给 `$http.get()` 或请求配置的 `params`。

## Request Body

JSON 请求体应声明 `application/json` 及明确 Schema：

```yaml
requestBody:
  required: true
  content:
    application/json:
      schema:
        $ref: '#/components/schemas/UserInput'
```

会生成数据参数，并根据 Schema 推导类型。尽量复用命名 Schema，减少难以阅读的内联类型。

## 响应 Schema

普通业务接口应声明明确的 JSON 成功响应，不要只写空对象或省略响应体：

```yaml
responses:
  '200':
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/AjaxResultUser'
```

如果项目配置 `namePrefix: 'AjaxResult'`、`dataField: 'data'`，生成方法返回类型会收窄到 `AjaxResultUser.data`。包装结构中的 `code`、`message`、`data` 应与项目的运行时响应转换保持一致。

删除、启停等没有复杂数据的操作也应声明布尔值或明确的业务包装响应。成功响应解析为 `void` 时会被当前模板识别为下载。

## 文件下载

下载接口应返回二进制内容并声明合适的媒体类型，不声明 JSON 业务响应体。实际响应应设置 `Content-Disposition`，使运行时能够解析文件名。

```yaml
responses:
  '200':
    content:
      application/octet-stream:
        schema:
          type: string
          format: binary
```

生成后应核对该操作是否被解析为 `void` 并使用 `$http.downloadFile()`；不同 OpenAPI 文档写法的解析结果可能有差异。

## 文件上传

上传接口使用 `multipart/form-data`，文件字段声明为二进制字符串：

```yaml
requestBody:
  required: true
  content:
    multipart/form-data:
      schema:
        type: object
        properties:
          file:
            type: string
            format: binary
```

当前 Codegen 不会自动改用 `$http.upload()`。需要上传专用行为时，把组合或扩展代码放在生成目录之外，避免下次生成覆盖手工修改。
