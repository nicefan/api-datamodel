# 后端开发约定

本章以 Spring Boot 和 springdoc-openapi 为例，说明后端代码怎样生成稳定的 OpenAPI 文档，从而让 API Codegen 得到可读、可预测的 Business API。

```text
Spring Boot Controller / DTO
              ↓
      springdoc-openapi
              ↓
        Swagger / OpenAPI
              ↓
         API Codegen
              ↓
         Business API
```

注解写法会随 Spring Boot 和 springdoc-openapi 版本变化，但 Codegen 真正依赖的是最终 OpenAPI 中的路径、`operationId`、Tag、参数和响应 Schema。后端修改后应以实际生成文档为准。

## 业务路径约定

Controller 一级路径应代表稳定的业务模块：

```java
@RestController
@RequestMapping("/user")
@Tag(name = "user", description = "用户管理")
public class UserController {
}
```

```text
/user/list
      ↓
modulePath = user
      ↓
userApi
```

推荐使用 `/user`、`/order`、`/role` 等有明确业务含义的一级路径。网关前缀、环境路径和版本前缀不应随意混入业务模块；如果文档路径确实包含这些前缀，应与 Codegen 的 [`basePath` 和 `pathInDocument`](./config#service) 配置对应。

## 方法路径约定

模块内路径稳定表达具体资源或操作：

```java
@GetMapping("/list")
@GetMapping("/{id}")
@PutMapping("/{id}/status")
```

它们分别成为业务方法的 `requestPath`。路径一旦被前端使用，应避免只为实现重构而频繁更名。

## `operationId`

每个接口应通过 `@Operation` 提供明确、稳定且尽量全局唯一的 `operationId`：

```java
@Operation(operationId = "listUsers", summary = "查询用户列表")
@GetMapping("/list")
public AjaxResult<List<UserDto>> listUsers(UserQuery query) {
    // ...
}
```

`operationId` 是生成方法名的主要来源：

```text
operationId: listUsers
          ↓
userApi.listUsers()
```

不要依赖 springdoc-openapi 或上游生成器自动追加数字后缀来解决重名。重复名称会触发 Codegen 的 [`duplicateMethodStrategy`](./config#重名策略)。

## Tag

同一业务模块应使用一致的 Tag，并与一级业务路径表达相同归属：

```java
@Tag(name = "user", description = "用户管理")
@RequestMapping("/user")
```

Tag 会影响 `swagger-typescript-api` 的上游模块分组，最终 `modulePath` 仍主要从规范化后的 URL 路径推导。Tag 与路径不一致可能让同一模块的接口被拆分，或产生文件冲突。

## 参数

### Path 参数

路径占位符和参数名称必须一致，并显式声明类型：

```java
@Operation(operationId = "getUser")
@GetMapping("/{id}")
public AjaxResult<UserDto> getUser(@PathVariable("id") Long id) {
    // ...
}
```

OpenAPI 中的 Path 参数会生成独立方法参数，并写入请求路径模板。

### Query 参数

筛选、分页和排序字段使用明确的查询 DTO，字段类型、名称和必填性应稳定：

```java
public class UserQuery {
    @Schema(description = "名称关键字")
    private String keyword;

    @Schema(description = "页码", requiredMode = Schema.RequiredMode.REQUIRED)
    private Integer page;
}
```

springdoc-openapi 生成的 Query 参数会组成前端查询对象。应检查实际文档是否将 DTO 展开成 `in: query` 参数。

### Request Body

JSON 请求体使用明确 DTO，不要直接接收 `Object` 或无约束的 `Map`：

```java
@Operation(operationId = "createUser")
@PostMapping
public AjaxResult<UserDto> createUser(@RequestBody UserInput input) {
    // ...
}
```

Request Body 会成为业务方法的数据参数，其必填性和 TypeScript 类型来自最终 Schema。

## 响应模型

响应模型直接决定生成类型和 Business API 返回值：

```text
Java 返回类型
      ↓
OpenAPI Schema
      ↓
TypeScript 类型
      ↓
Business API 返回值
```

普通业务接口应使用明确 DTO 和统一响应包装：

```java
public class AjaxResult<T> {
    private Integer code;
    private String message;
    private T data;
}
```

同时保证 springdoc-openapi 能在实际文档中展开泛型。如果项目生成了名为 `AjaxResultUser` 的包装 Schema，并配置：

```ts
responseSchema: {
  namePrefix: 'AjaxResult',
  dataField: 'data',
}
```

Codegen 会尝试把返回类型收窄到 `data` 字段对应的 `User`。如果 springdoc-openapi 生成的 Schema 名称不稳定，可以为具体响应声明稳定名称：

```java
@Schema(name = "AjaxResultUser")
public class UserResult extends AjaxResult<UserDto> {
}
```

具体名称和泛型展开结果取决于项目使用的 springdoc-openapi 版本及配置，必须检查最终 `/v3/api-docs`，再让 `responseSchema.namePrefix` 与实际 Schema 名称匹配。

应避免：

- 返回 `Object`、原始 `Map` 或无 Schema 的动态结构；
- 普通成功响应省略响应体；
- 泛型只存在于 Java 类型中，但生成文档没有展开 `data`；
- Controller 声明类型与实际返回结构不一致。

成功响应被上游解析为 `void` 时，当前 Codegen 模板会把它识别为下载接口，因此删除、启停等普通业务操作也应声明明确响应 Schema。

## 上传与下载

### 上传

Spring Boot 上传接口应声明 `multipart/form-data` 和明确文件字段：

```java
@Operation(operationId = "uploadAvatar")
@PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
public AjaxResult<FileInfoDto> uploadAvatar(
        @RequestPart("file") MultipartFile file) {
    // ...
}
```

最终 OpenAPI 中应出现 `multipart/form-data`，文件字段应为二进制字符串。当前 Codegen 不会自动改用 `$http.upload()`；需要上传专用行为时，应在生成目录之外组合或扩展生成 API。

### 下载

下载接口应返回二进制内容，并正确设置媒体类型和 `Content-Disposition`：

```java
@Operation(operationId = "downloadReport")
@GetMapping(value = "/report", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
public ResponseEntity<Resource> downloadReport() {
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=report.csv")
        .body(resource);
}
```

不同 OpenAPI 声明可能被上游解析成不同结果。当前模板只有在成功响应被解析为 `void` 时才生成 `$http.downloadFile()`，因此生成后需要核对下载方法，不能仅凭后端声明假定转换一定发生。

## 常见不推荐写法

| 后端写法 | 对生成结果的影响 |
| --- | --- |
| 一级路径没有稳定业务含义 | `modulePath` 和业务 API 文件名不稳定 |
| 缺失或重复 `operationId` | 方法名不可预测或发生重名冲突 |
| 同一模块使用不同 Tag | 上游模块可能被拆分并引发文件冲突 |
| 返回 `Object` 或无约束 `Map` | TypeScript 类型退化，业务返回值无法收窄 |
| 成功响应没有明确 Schema | 可能生成 `void` 并被误识别为下载 |
| Path 参数名称与占位符不一致 | 路径模板参数生成异常 |
| 文档路径混入未配置的网关前缀 | 错误的一级路径会成为 `modulePath` |

后端约定的验收标准不是注解本身，而是最终 OpenAPI 能否稳定表达接口，并让 [默认生成规则](./#默认生成规则) 得到预期代码。
