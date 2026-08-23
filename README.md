# api-datamodel

面向业务资源组织前端接口的 TypeScript 请求模型。

`api-datamodel` 不绑定具体请求库，而是在 Axios、UniApp 等请求适配器之上，通过 Resource 统一业务路径、返回数据、加载状态、消息提示和请求取消。常规项目使用一个默认 Resource；涉及多个后台服务时，再按服务域分别配置地址、鉴权和数据规则。项目还提供 API Codegen，可根据 Swagger/OpenAPI 文档生成可调用、可维护、具备类型提示的业务模块 API 实例。

## 核心价值

- **按业务建模，而不是散落 URL**：用 `userApi`、`orderApi` 等稳定对象承载一个业务资源的全部操作。
- **默认资源即可覆盖常规项目**：配置一次默认 Resource，所有业务模块都从它创建 API 实例。
- **复杂项目按服务域隔离**：不同后台服务可分别配置地址、鉴权、请求头和返回数据规则，再创建各自的业务模块 API。
- **API Codegen**：根据 Swagger/OpenAPI 文档生成请求代码、数据类型和统一导出文件，减少重复手写和前后端偏差。
- **请求实现可替换**：核心只依赖请求适配器，可接入 Axios、UniApp、Taro 或自定义实现。
- **横切能力统一治理**：在一个位置处理服务地址、鉴权、返回结构、Loading、消息提示和异常。
- **能力按需组合**：可单独使用 `Http`，也可组合业务资源和代码生成。

## 业务模式

`api-datamodel` 的核心是 `Resource`。业务代码不直接管理请求地址，而是先配置资源，再由资源创建业务模块 API 实例。

> 资源配置定义请求规则，服务域 Resource 承载这些规则，再由 Resource 创建业务模块 API 实例对象。默认资源优先，多个服务域按需创建。

大多数项目只需要一个默认资源：

```text
默认资源配置 → 默认 Resource（createApi）→ userApi / orderApi / roleApi
```

当复杂项目同时连接多个后台服务时，再按照服务域分别创建 Resource：

```text
系统服务配置   → 系统 Resource（createSystemApi）     → userApi / roleApi
工作流服务配置 → 工作流 Resource（createWorkflowApi） → taskApi / processApi
文件服务配置   → 文件 Resource（createFileApi）       → fileApi
```

每个服务域 Resource 可以拥有独立的 `serverUrl`、`rootPath`、鉴权逻辑、默认请求参数和返回数据转换；它创建的业务模块 API 实例自动继承这些规则。

对应的代码层次如下：

| 层次 | 作用 | 示例 |
| --- | --- | --- |
| 请求适配器 | 真正发送网络请求 | `axios`、`buildAdapter(uni)` |
| 默认资源配置 | 常规项目共享的地址、鉴权和返回规则 | `defaultResourceConfig` |
| 服务域 Resource | 固定某个后台服务的请求边界 | `createApi`、`createSystemApi` |
| 业务模块 API 实例 | 聚合同一业务模块的全部操作 | `userApi.list()`、`userApi.save()` |

```mermaid
flowchart LR
  DefaultConfig["默认资源配置"] --> DefaultResource["默认 Resource · createApi"]
  SystemConfig["系统服务配置"] --> SystemResource["系统 Resource · createSystemApi"]
  WorkflowConfig["工作流服务配置"] --> WorkflowResource["工作流 Resource · createWorkflowApi"]
  DefaultResource --> CommonApis["常规业务模块 API"]
  SystemResource --> SystemApis["userApi / roleApi"]
  WorkflowResource --> WorkflowApis["taskApi / processApi"]
  CommonApis --> DefaultBackend["默认后台服务"]
  SystemApis --> SystemBackend["系统后台服务"]
  WorkflowApis --> WorkflowBackend["工作流后台服务"]
```

推荐将目录按职责拆分：

```text
src/api/
├─ dataModel.ts          # 默认资源配置与服务域 Resource 工厂
├─ sys/                  # API Codegen 生成的系统管理接口
│  ├─ Users.ts
│  └─ index.ts
└─ workflow/             # API Codegen 生成的工作流接口
```

## 安装

```bash
pnpm add api-datamodel
```

也可使用 npm 或 yarn：

```bash
npm install api-datamodel
yarn add api-datamodel
```

## 快速开始

### 1. 创建默认资源

创建 `src/api/dataModel.ts`：

```ts
import { defineConfig, fetchAdapter, serviceInit, setLoadingServe } from 'api-datamodel'

// 非 silent 请求需要初始化 Loading 服务。
// 可接入任意 UI 框架；暂不需要界面反馈时可使用空实现。
setLoadingServe({
  show() {},
  close() {},
})

export const defaultResourceConfig = defineConfig({
  // 任何接收 RequestConfig 并返回 Promise 的函数都可作为适配器。
  adapter: fetchAdapter,
  serverUrl: '/api',
  rootPath: '',
  defRequestConfig: {
    timeout: 30_000,
    headers: { 'content-type': 'application/json' },
  },
  requestInterceptors(config) {
    // 可在这里统一注入 token、租户、区域等信息。
    return config
  },
  transformResponse(result) {
    const { code, msg, data } = result
    return {
      code,
      message: msg === 'SUCCESS' ? '' : msg,
      data,
      success: code === 0 || code === 200,
    }
  },
})

// 初始化默认资源，并获得业务模块 API 创建方法。
export const createApi = serviceInit(defaultResourceConfig)
```

`transformResponse` 应返回 `{ code, message, data, success }`。其中 `success` 决定请求进入成功还是失败分支，成功时业务方法直接得到 `data`。

### 2. 定义业务资源

```ts
import { createApi } from './dataModel'

interface User {
  id: number
  name: string
}

interface UserQuery {
  keyword?: string
  page: number
}

interface Page<T> {
  records: T[]
  total: number
}

// userApi 是由默认 Resource 创建的“用户”业务模块 API 实例。
export const userApi = createApi('user', {
  list(query: UserQuery, config?: RequestConfig) {
    return this.$http.get<Page<User>>('page', query, config)
  },

  getInfo(id: number, config?: RequestConfig) {
    return this.$http.get<User>(`${id}`, undefined, config)
  },

  save(user: Partial<User>) {
    return this.$http.post<number>('save', user).then((id) => {
      this.$http.setMessage('用户保存成功')
      return id
    })
  },

  // 业务方法名与 delete、get、post、request 等底层方法重名时，
  // 通过只读的 $http 调用底层请求，避免递归调用自己。
  delete(id: number, config?: RequestConfig) {
    return this.$http.delete<boolean>(`delete/${id}`, undefined, config)
  },
})
```

通过 `create`、`factory` 或 `serviceInit` 创建的业务 API 实例都会公开一个只读的 `$http` 属性。它是同一资源的底层请求实例，继承当前资源的地址、请求配置、拦截器和消息处理能力，不需要重新配置请求服务。

`$http` 可直接调用以下底层方法：

| 方法 | 用途 |
| --- | --- |
| `$http.request()` | 发起自定义请求 |
| `$http.get()`、`$http.post()`、`$http.put()`、`$http.delete()` | 发起对应 HTTP 请求 |
| `$http.upload()`、`$http.downloadFile()` | `ApiResource` 提供的上传和下载请求 |
| `$http.setMessage()` | 设置或替换当前请求的提示消息 |
| `$http.abort()` | 取消该资源的全部进行中请求 |

在资源扩展方法内部使用 `this.$http`，在业务代码中使用 `userApi.$http`。当扩展方法覆盖了 `get`、`post`、`put`、`delete`、`request`、`upload` 或 `downloadFile` 等同名方法时，必须通过 `$http` 调用底层方法：

```ts
export const userApi = createApi('user', {
  request(id: number, config?: RequestConfig) {
    return this.$http.get<User>(`${id}`, undefined, config)
  },
})

// 业务代码中也可以直接使用底层实例；这里仍然继承 user 资源路径。
const user = await userApi.$http.get<User>('1001')

// $http 是只读属性，不能替换为另一个请求实例。
userApi.$http.abort('页面已离开')
```

按照上面的配置，路径组合如下：

```text
serverUrl  /api
rootPath   空
resource   user
operation  page
最终地址   /api/user/page
```

资源名以 `/` 开头时会绕过 `rootPath`。需要继承业务域前缀时，应使用 `user`，不要使用 `/user`。

### 3. 在业务代码中调用

```ts
const page = await userApi.$http.get<Page<User>>('page', { page: 1 })
const user = await userApi.$http.get<User>('1001')

// 取消该资源当前所有进行中的请求，也可以使用 userApi.$http.abort()。
userApi.$http.abort('页面已离开')
```

默认模式下，项目只需维护 `defaultResourceConfig` 和 `createApi`。所有业务模块 API 实例共享同一套服务地址、鉴权、拦截器和返回数据规则。

## 多服务域资源

只有当项目涉及不同后台服务，或者不同服务需要独立的地址、鉴权和返回规则时，才需要创建多个服务域 Resource。

例如系统服务与工作流服务分别使用不同代理地址和鉴权头：

```ts
import { ApiResource, defineConfig } from 'api-datamodel'
import axios from 'axios'
import { defaultResourceConfig } from './dataModel'

const systemResourceConfig = defineConfig({
  ...defaultResourceConfig,
  serverUrl: '/system-api',
  requestInterceptors(config) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${getSystemToken()}`,
    }
    return config
  },
})

const workflowResourceConfig = defineConfig({
  adapter: axios,
  serverUrl: '/workflow-api',
  defRequestConfig: {
    timeout: 60_000,
  },
  requestInterceptors(config) {
    config.headers = {
      ...config.headers,
      'X-Workflow-Token': getWorkflowToken(),
    }
    return config
  },
  transformResponse(result) {
    return {
      code: result.status,
      message: result.message,
      data: result.result,
      success: result.status === 200,
    }
  },
})

// 每个创建方法代表一个配置独立的服务域 Resource。
export const createSystemApi = ApiResource.factory(systemResourceConfig)
export const createWorkflowApi = ApiResource.factory(workflowResourceConfig)
```

服务域 Resource 再创建对应的业务模块 API 实例：

```ts
export const userApi = createSystemApi('user', {
  list(query: UserQuery) {
    return this.$http.get<User[]>('list', query)
  },
})

export const taskApi = createWorkflowApi('task', {
  pending() {
    return this.$http.get<Task[]>('pending')
  },
})
```

```text
createSystemApi   + user   + list     → /system-api/user/list
createWorkflowApi + task   + pending  → /workflow-api/task/pending
```

业务页面最终只依赖 `userApi`、`taskApi` 等模块实例，不需要关心它们来自哪个后台地址或使用哪套鉴权规则。

## API Codegen

API Codegen 根据 Swagger/OpenAPI 文档生成请求代码和数据类型，并创建业务资源和目录下的 `index.ts`。生成文件应视为后端文档的投影，不建议直接修改；业务补充逻辑可放在独立文件中组合或覆盖。

### 后端 Swagger 编写规范

当前内置模板会把 Swagger/OpenAPI 路由转换为 Resource 上的业务方法。为了让生成结果稳定、可读，后端文档建议遵循以下规则。

#### 路径与模块

路径的第一个非空段会作为资源前缀，并从接口的相对路径中移除：

```text
/user/list       → createApi('user', { listUsers() { ... } })
/user/{id}       → createApi('user', { getUser(id) { ... } })
```

生成的资源路径为 `resource.rootPath + 第一个路径段`，相对接口路径为去掉第一个路径段后的部分。因此：

- `paths` 中只写服务内的接口路径，不要把完整域名或服务地址写进路径。
- 同一业务模块的接口应使用相同的第一个路径段，例如统一使用 `/user/...`。
- `resource.rootPath` 默认按 `gateway` 处理，由 Resource Factory 统一补充网关前缀。
- 当 `resource.rootPathSource` 为 `document` 时，生成器会从 Swagger 路径开头去掉完整的 `rootPath`，或能匹配的最长尾部路径。例如 `rootPath: 'api/v1'` 可处理以 `/api/v1` 或 `/v1` 开头的文档路径。
- `tags[0]` 会参与接口模块分组；建议让第一个 Tag 与路径的第一个段表达同一个业务域。
- 如果多个接口模块的路径前缀发生冲突，模板会追加后续路径段生成唯一的 API 变量名，因此路径段应保持稳定、可区分。

以 Springdoc 注解为例，Controller 的类级路径应直接对应资源模块，Tag 和路径首段保持一致：

```java
@Tag(name = "User")
@RestController
@RequestMapping("/user")
public class UserController {
  @Operation(summary = "查询用户", operationId = "getUser")
  @GetMapping("/{id}")
  public AjaxResult<UserVO> getUser(@PathVariable Long id) {
    // ...
  }
}
```

这会形成 `/user/{id}`，前端生成 `userApi`，并把 `{id}` 生成方法参数。使用网关前缀时，Swagger 不要重复写入该前缀；如果 Swagger 本身已经包含前缀，则将 `resource.rootPathSource` 设为 `document`。

#### 操作名与参数

| Swagger 字段 | 生成结果 | 编写要求 |
| --- | --- | --- |
| `operationId` | 业务 API 方法名 | 必填、唯一，使用合法且有业务含义的 TypeScript 方法名 |
| `in: path` | 方法的独立位置参数 | 参数名必须与路径中的 `{id}` 一致，并设置 `required: true` |
| `in: query` | 一个查询对象参数 | 查询参数使用明确的类型和 `required` 定义 |
| `requestBody` | 方法的请求体参数 | 优先使用 `components.schemas` 中的 `$ref`，并正确设置 `required` |
| `in: header` | 不会自动生成业务方法参数 | 鉴权和公共请求头应配置在 Resource、拦截器或 `RequestConfig` 中 |

例如：

```yaml
paths:
  /user/{id}:
    get:
      tags: [User]
      operationId: getUser
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: 成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'

  /user/save:
    post:
      tags: [User]
      operationId: saveUser
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SaveUserRequest'
      responses:
        '200':
          description: 成功
          content:
            application/json:
              schema:
                type: boolean
```

上面的文档会生成类似以下代码：

```ts
export const userApi = createApi('user', {
  getUser(id: number, config?: RequestConfig) {
    return this.$http.get<User>(`/${id}`, undefined, config)
  },

  saveUser(payload: SaveUserRequest, config?: RequestConfig) {
    return this.$http.post<boolean>('/save', payload, config)
  },
})
```

#### 请求和返回值

- `GET`、`POST`、`PUT`、`DELETE` 会分别生成 `$http.get`、`$http.post`、`$http.put`、`$http.delete`。模板会按 HTTP 方法名直接拼接 `$http.<method>`；当前 `Http/Resource` 没有内置 `$http.patch`、`$http.head` 等方法，使用这些方法前需要扩展运行时或改用自定义模板。
- 成功响应中的 Schema 会成为 `$http` 方法的 TypeScript 泛型；`components.schemas` 中的对象、枚举和数组会生成到 `data-contracts.ts`。
- 如果响应模型名称以 `responseSchema.namePrefix` 开头（默认是 `AjaxResult`），并且包含 `responseSchema.dataField` 字段，模板会将业务方法的返回类型展开为该字段的类型。建议统一使用类似 `AjaxResultUser`、`AjaxResultUserList` 的具体响应模型。
- 请求体模型的字段全部可选时，生成的方法会把请求体默认成 `{}`；必须提交请求体的接口应在 `requestBody.required` 或字段 `required` 中准确声明。
- 当前模板会把解析为 `void` 的成功响应统一生成 `$http.downloadFile`。因此普通删除或更新接口不要只定义无响应体的 `204`，否则可能被当成文件下载接口；普通业务接口应返回明确的 JSON Schema。
- `multipart/form-data` 不会自动转换为 `$http.upload`，文件上传接口需要在业务层使用 `$http.upload`，或另行提供自定义模板。

接口的 `summary`、`description`、请求方法和路径会写入生成方法的 JSDoc；响应 Schema 主要负责类型生成，实际的鉴权、服务地址和统一返回值处理仍由 Resource 配置负责。

#### `responseSchema` 响应模型规范

项目运行时的统一响应处理约定为 `{ success, code, message, data }`。后端接口应让成功响应的 OpenAPI Schema 明确描述 `data` 的实际类型，并为不同的 `data` 类型生成稳定的 Schema 名称：

```yaml
components:
  schemas:
    AjaxResultUser:
      type: object
      properties:
        success:
          type: boolean
        code:
          type: integer
        message:
          type: string
        data:
          $ref: '#/components/schemas/UserVO'
```

对应的注解应明确声明具体响应模型，而不是只声明一个没有泛型信息的 `AjaxResult`：

```java
@Operation(summary = "查询用户", operationId = "getUser")
@ApiResponse(
    responseCode = "200",
    content = @Content(
        mediaType = "application/json",
        schema = @Schema(implementation = AjaxResultUser.class)
    )
)
```

模板识别到以 `AjaxResult` 开头且包含 `data` 字段的响应模型时，会把生成方法的返回泛型展开为 `data` 类型：

```ts
getUser(id: number, config?: RequestConfig): Promise<UserVO>
```

因此建议遵循以下约定：

- 响应模型命名使用 `AjaxResult` + 业务类型，例如 `AjaxResultUser`、`AjaxResultUserList`、`AjaxResultBoolean`。
- 如果后端使用通用 `AjaxResult<T>`，应通过 `@Schema(name = "AjaxResultUser")` 或框架等价配置，让最终 `components.schemas` 中的具体模型名称仍以 `AjaxResult` 开头。
- `data` 字段必须有明确的 `$ref`、数组或基础类型 Schema，不要只声明为空对象。
- 普通删除、启用、停用接口也建议返回 `AjaxResultBoolean`，避免只有 `204` 无响应体而被模板识别为下载接口。
- `success`、`code`、`message`、`data` 的字段名应保持一致；Resource 的 `transformResponse` 会据此提取 `data`。

#### `downloadFile` 响应规范

当前 `procedure-call.ejs` 的判断是：成功响应被解析为 `void` 时，生成 `$http.downloadFile`，而不是普通的 `$http.get` 或 `$http.post`。因此文件下载接口应明确使用“服务端写入二进制响应、Swagger 不声明 JSON 响应体”的约定：

```java
@Operation(summary = "导出用户", operationId = "exportUsers")
@ApiResponse(responseCode = "200", description = "文件流")
@GetMapping("/export")
public void exportUsers(HttpServletResponse response) {
  // 设置 Content-Type、Content-Disposition，并将文件写入 response
}
```

生成结果类似：

```ts
exportUsers(config?: RequestConfig) {
  return this.$http.downloadFile('/export', { method: 'GET', ...config })
}
```

下载接口还应在实际 HTTP 响应中设置 `Content-Disposition`，这样 `downloadFile` 才能解析文件名。反之，普通业务接口不要使用“无响应体”的写法来表示成功；应声明 `AjaxResult<T>` 或其他明确的 JSON Schema，否则同样会生成 `downloadFile`。

### 业务项目配置

推荐在业务项目根目录创建 `api-datamodel.config.ts`，CLI 会自动发现并加载该文件：

```ts
import defineConfig from 'api-datamodel/codegen/defineConfig.js'

export default defineConfig({
  // 所有接口共用的配置。
  outputDir: 'src/api',
  resource: {
    // 每个输出目录都会生成 resource.ts；指定后会从该路径导入 Resource 类。
    importPath: '@/api/dataModel/resource',
    rootPath: 'system',
    rootPathSource: 'gateway',
  },
  responseSchema: {
    namePrefix: 'AjaxResult',
    dataField: 'data',
  },
  generatorOptions: {
    cleanOutput: true,
    modular: true,
    routeTypes: true,
  },

  // 每项代表一个可独立生成的后端文档或业务域。
  apis: {
    sys: {
      label: '系统管理',
      url: 'http://127.0.0.1:8080/v3/api-docs/系统管理',
      outputFolder: 'sys',
    },
  },
})
```

`defineConfig` 原样返回配置对象，并提供 TypeScript 类型提示。

生成器与 Resource 有两种对应方式：

- 默认资源模式：使用 `resource` 配置 Resource 类、`rootPath` 和前缀来源；生成器会在输出目录生成 `resource.ts`，省略 `resource.importPath` 时使用内置 `ApiResource`。
- 多服务域模式：为每个接口配置指定不同的 `resource.importPath`；生成的 `resource.ts` 会导入该路径的默认 Resource 类，服务地址、鉴权和请求规则由该类负责。

多服务域示例：

```js
apis: {
  sys: {
    url: 'http://127.0.0.1:8080/v3/api-docs/系统管理',
    resource: {
      importPath: '@/api/systemResource',
      rootPath: 'system',
      rootPathSource: 'gateway',
    },
    outputFolder: 'sys',
  },
}
```

### 配置项

| 配置项 | 位置 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `outputDir` | 全局或单接口 | `src/api` | 生成根目录 |
| `resource` | 全局或单接口 | `rootPathSource: 'gateway'` | Resource 类导入路径、Factory 前置路径及其来源 |
| `responseSchema` | 全局或单接口 | `AjaxResult` + `data` | 响应模型包装规则；配置 `namePrefix` 和 `dataField` |
| `url` | 单接口 | 无 | Swagger/OpenAPI JSON 地址 |
| `outputFolder` | 单接口 | 当前配置名称 | 输出子目录 |
| `label` | 单接口 | 配置名称 | 交互选择时显示的名称 |
| `generatorOptions` | 全局或单接口 | 内置推荐配置 | 传递给 `swagger-typescript-api` 的其他选项 |

单接口配置会覆盖全局配置。

默认按顺序查找以下文件：

1. `api-datamodel.config.ts`
2. `api-datamodel.config.mjs`
3. `api-datamodel.config.js`
4. `api-datamodel.config.cjs`
5. `api-datamodel.config.json`

配置文件也可以导出返回配置对象的同步或异步函数。对于未声明 `"type": "module"` 的项目，推荐使用 `.mjs`，或者在 `.cjs` 中使用 `module.exports`。

### 加入 package.json 命令

```json
{
  "scripts": {
    "genApi": "api-datamodel-codegen",
    "genApi:sys": "api-datamodel-codegen sys"
  }
}
```

```bash
# 读取 apis.sys
pnpm genApi:sys

# 不指定名称时，从所有配置中交互选择
pnpm genApi
```

指定非默认配置文件：

```bash
api-datamodel-codegen --config ./config/api.mjs sys
```

也可直接传入位置参数：

```bash
npx api-datamodel-codegen <文档地址> <输出文件夹>
```

查看完整命令帮助：

```bash
npx api-datamodel-codegen --help
```

## 请求配置与运行时能力

### 单次请求配置

```ts
await userApi.list(
  { page: 1 },
  {
    silent: true,
    timeout: 10_000,
    signal: controller.signal,
  },
)
```

常用扩展字段：

| 字段 | 作用 |
| --- | --- |
| `silent` | 不显示 Loading，也不显示成功或错误消息 |
| `backendLoad` | 不进入 Loading 队列，但仍可处理消息 |
| `messageMode` | 错误提示模式：`none`、`message` 或 `modal` |
| `signal` | 使用标准 `AbortSignal` 取消单个请求 |
| `IgnoreInterceptor` | 跳过返回数据转换和业务拦截 |

`IgnoreInterceptor` 是当前 API 的实际字段名，首字母必须大写。非 JSON 的 `responseType` 默认会自动跳过业务拦截。

### Loading 和消息

普通请求在持续超过 200ms 后才显示 Loading，避免短请求造成闪烁；同批并发请求全部结束后统一关闭。

```ts
import { setLoadingServe } from 'api-datamodel'

setLoadingServe({
  show() {
    // 打开全局 Loading
  },
  message(message) {
    // 每个请求结束时可选地处理消息
  },
  close(lastMessage, messageList) {
    // 关闭 Loading，并集中处理本批请求的消息
  },
})
```

业务方法可在请求回调中用 `$http.setMessage` 替换后端消息：

```ts
save(data: UserInput) {
  return this.$http.post('save', data).then((result) => {
    this.$http.setMessage('保存成功')
    return result
  })
}
```

在请求回调中传入空字符串可取消当前请求的默认消息：

```ts
await userApi.save(data).then((result) => {
  userApi.$http.setMessage('')
  return result
})
```

### 请求取消

```ts
const controller = new AbortController()
const request = userApi.$http.get<User>('1001', undefined, { signal: controller.signal })

controller.abort('用户取消')
await request
```

也可取消某个资源的全部进行中请求：

```ts
userApi.$http.abort('页面已离开')
```

## 文件上传、下载和跨平台适配

### Web 文件上传与下载

```ts
const formData = new FormData()
formData.append('file', file)

await userApi.$http.upload('avatar', formData)

const { filename, data } = await userApi.$http.downloadFile('export')
```

`downloadFile` 默认从 `Content-Disposition` 解析普通文件名和 RFC 5987 编码文件名，返回 `{ filename, data }`。

### UniApp/Taro 类平台

`buildAdapter` 将平台的 `request`、`uploadFile` 和 `downloadFile` 统一为请求适配器：

```ts
import { ApiResource, buildAdapter } from 'api-datamodel'

export const createApi = ApiResource.factory({
  adapter: buildAdapter(uni),
  serverUrl: 'https://example.com/api',
})
```

跨平台上传参数：

```ts
await userApi.$http.upload('avatar', {
  filePath: tempFilePath,
  fileKey: 'file',
  userId: 1001,
})
```

外部 `AbortSignal` 会同步调用平台请求任务的 `abort()`。

## 公共 API

| 导出 | 作用 |
| --- | --- |
| `Http` | 标准请求类；提供 `request`、`get`、`post`、`put`、`delete`、`abort` 和工厂方法 |
| `ApiResource` | 在 `Http` 上增加 `upload`、`downloadFile` 的业务资源类 |
| 业务 API 实例的 `$http` | 只读的底层请求实例；用于处理方法重名、直接发起请求或取消该资源的请求 |
| `defineConfig` | 为请求配置提供 TypeScript 类型约束 |
| `api-datamodel/codegen/defineConfig.js` | API Codegen 配置的 `defineConfig` 默认导出 |
| `setGlobalConfig` | 合并全局请求配置 |
| `serviceInit` | 设置全局配置并返回资源工厂 |
| `setLoadingServe` | 接入全局 Loading 和消息服务 |
| `buildAdapter` | 适配 UniApp/Taro 类跨平台请求 API |
| `fetchAdapter` | 将浏览器或 Node.js 18+ 的标准 Fetch API 包装为请求适配器 |

## 使用约束

- 资源扩展对象中的函数会绑定到资源实例，其他属性按原值保留。
- 业务方法覆盖 `get`、`post`、`delete`、`request` 等名称时，必须通过 `this.$http` 调用底层请求。
- API Codegen 开启 `cleanOutput` 后会清理对应输出目录，请勿在生成目录手写业务文件。
- `transformResponse` 应明确返回 `success`，否则无法可靠判断业务成功状态。
- 非 `silent` 请求需要先调用 `setLoadingServe`；没有 UI 需求时可传入空实现。
- 资源名以 `/` 开头会绕过 `rootPath`，业务域模式下通常不应使用前导斜杠。
