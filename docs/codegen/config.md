# Codegen 配置

配置决定生成器如何读取 OpenAPI 文档、连接已有 Service，以及如何改变 [默认生成规则](./#默认生成规则)。

## 配置文件

Codegen 按顺序查找：

1. `api-datamodel.config.ts`
2. `api-datamodel.config.mts`
3. `api-datamodel.config.mjs`
4. `api-datamodel.config.js`
5. `api-datamodel.config.cts`
6. `api-datamodel.config.cjs`
7. `api-datamodel.config.json`

配置也可以导出返回配置对象的同步或异步函数。使用 `--config` 可指定其他文件。

## 完整示例

```ts
import defineConfig from 'api-datamodel/codegen/defineConfig.js'

export default defineConfig({
  outputDir: 'src/api',
  importStatement: "import service from '@/api/dataModel'",
  service: {
    basePath: 'system',
    pathInDocument: false,
  },
  responseSchema: {
    namePrefix: 'AjaxResult',
    dataField: 'data',
  },
  documentRequest: {
    timeout: 30_000,
    // headers: { Authorization: 'Bearer ...' },
  },
  duplicateMethodStrategy: 'strip',
  generatorOptions: {
    cleanOutput: true,
    modular: true,
    routeTypes: true,
  },
  apis: {
    sys: {
      label: '系统管理',
      url: 'https://example.com/openapi.json',
      outputFolder: 'sys',
    },
  },
})
```

## 配置项总览

| 配置项 | 位置 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `outputDir` | 全局或单 API | `src/api` | 生成根目录，必须位于项目目录内 |
| `importStatement` | 全局或单 API | 无 | 工厂方法或 Service 的导入语句 |
| `service` | 全局或单 API | 无 | Service 派生和生成路径解释配置 |
| `responseSchema` | 全局或单 API | `AjaxResult` + `data` | 响应包装模型识别规则 |
| `generatorOptions` | 全局或单 API | 内置推荐配置 | 传给 `swagger-typescript-api` 的选项 |
| `documentRequest` | 全局或单 API | `timeout: 30000` | 获取远程文档时的超时和请求头 |
| `duplicateMethodStrategy` | 全局或单 API | `strip` | 重名方法处理策略 |
| `apis` | 全局 | 无 | 按名称保存的单 API 配置集合 |
| `url` | 单 API | 无 | 远程 URL、本地 JSON 路径或 `file:` URL |
| `outputFolder` | 单 API | 当前 API 名称 | `outputDir` 下的输出子目录 |
| `label` | 单 API | 当前 API 名称 | 交互选择时显示的名称 |

## 输出与 API 文档

### `outputDir` 与 `outputFolder`

`outputDir` 是生成根目录，`outputFolder` 是单个 API 的输出子目录：

```text
outputDir: src/api
outputFolder: sys
        ↓
src/api/sys
```

`outputFolder` 必须位于 `outputDir` 内且不能等于 `outputDir`，避免整体替换时影响生成根目录或项目外文件。

### `apis`、`url` 与 `label`

`apis` 以名称组织一个或多个 OpenAPI 来源：

```ts
apis: {
  sys: {
    label: '系统管理',
    url: './openapi/sys.json',
    outputFolder: 'sys',
  },
}
```

`url` 可以是远程地址、本地 JSON 文件或 `file:` URL。`label` 只影响交互选择时的显示文本，不改变生成文件和代码。

## `importStatement` 与 `service`

```ts
importStatement: "import service from '@/api/dataModel'"
service: {
  basePath: string
  pathInDocument?: boolean
}
```

`importStatement` 只接受单个默认导入或单成员具名导入。未配置 `service` 时，导入项作为工厂方法直接写入各业务模块：

```ts
importStatement: "import { createApi } from '@/api/service'"
```

配置 `service` 时，导入项作为 Service，生成的 `resource.ts` 通过 `with({ basePath })` 派生工厂方法。`basePath` 必须是非空字符串。

### `basePath`

生成的 `resource.ts` 会先派生 Service：

```ts
const apiService = service.with({ basePath: 'system' })
```

各业务模块再通过该派生 Service 的 `createApi()` 创建。原 Service 不会被修改。

### `pathInDocument`

OpenAPI 路径以 `basePath` 开头时配置为 `true`，生成器会先排除该基础路径，再提取模块名和 `modulePath`。默认 `false`。

```text
basePath: system
OpenAPI: /system/user/list
modulePath: user
```

## `responseSchema`

```ts
responseSchema: {
  namePrefix?: string
  dataField?: string
}
```

当成功响应类型名称以 `namePrefix` 开头时，生成器尝试读取该模型的 `dataField` 字段，将方法返回类型收窄为业务数据：

```text
namePrefix: AjaxResult
dataField: data

AjaxResultUser
      ↓ data
     User
```

找不到目标字段时使用完整响应类型。两项都允许配置为空字符串，以关闭对应的匹配条件。

## 重名策略

`swagger-typescript-api` 会给重复 `operationId` 追加数字后缀。`duplicateMethodStrategy` 决定 Codegen 如何处理：

```text
listUsers
listUsers_2
```

- `strip`：移除上游数字后缀，报告错误但继续生成，结果中可能出现重复方法名；
- `keep-suffix`：冲突方法保留数字后缀，报告警告并继续生成；
- `error`：发现冲突立即终止，正式输出目录保持不变。

默认值是 `strip`。希望生成失败而不是得到可能重复的方法时，应显式配置 `error`。

## `generatorOptions`

该对象首先影响 `swagger-typescript-api` 的上游解析和生成结果，再影响 `api-datamodel` 的后续转换。内置值为：

```ts
{
  modular: true,
  routeTypes: true,
  generateClient: true,
  moduleNameFirstTag: true,
  cleanOutput: true,
}
```

用户配置在其后覆盖。修改上游选项可能改变模块分组、类型和路由结构，应结合实际生成结果验证。

`generatorOptions.templates` 可以指定相对项目目录的自定义模板目录；目录无效时生成终止。

## `documentRequest`

```ts
documentRequest: {
  timeout?: number
  headers?: Record<string, string>
}
```

该配置只用于获取远程 OpenAPI 文档。超时必须大于 0，默认 30 秒；请求头可用于文档鉴权。本地 `.json` 文件直接从项目目录解析，不使用该请求配置。

## 配置继承与覆盖

`apis.<name>` 覆盖全局配置。其中 `service`、`responseSchema`、`generatorOptions`、`documentRequest` 按字段合并，`documentRequest.headers` 也按字段合并；其他字段按单 API 值覆盖。

```ts
export default defineConfig({
  outputDir: 'src/api',
  importStatement: "import service from '@/api/dataModel'",
  service: {
    basePath: 'api',
  },
  documentRequest: {
    headers: { Authorization: 'Bearer token' },
  },
  apis: {
    workflow: {
      url: './openapi/workflow.json',
      service: {
        basePath: 'workflow',
      },
      documentRequest: {
        headers: { 'x-document-source': 'workflow' },
      },
    },
  },
})
```

`workflow` 最终继承全局导入语句，覆盖 `basePath`，并同时保留两个文档请求头。
