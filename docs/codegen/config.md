# Codegen 配置

配置文件只控制生成器如何读取文档、连接已有 Service 并写出文件。Service 的运行时语义见 [Service 与业务 API](../guide/service-api)。

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
  service: {
    importPath: '@/api/dataModel',
    importName: 'service',
    rootPath: 'system',
    rootPathSource: 'gateway',
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

## 配置项

| 配置项 | 位置 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `outputDir` | 全局或单 API | `src/api` | 生成根目录，必须位于项目目录内 |
| `service` | 全局或单 API | `rootPathSource: 'gateway'` | Service 导入和生成路径解释配置 |
| `responseSchema` | 全局或单 API | `AjaxResult` + `data` | 响应包装模型识别规则 |
| `generatorOptions` | 全局或单 API | 内置推荐配置 | 传给 `swagger-typescript-api` 的选项 |
| `documentRequest` | 全局或单 API | `timeout: 30000` | 获取远程文档时的超时和请求头 |
| `duplicateMethodStrategy` | 全局或单 API | `strip` | `strip`、`keep-suffix` 或 `error` |
| `apis` | 全局 | 无 | 按名称保存的单 API 配置集合 |
| `url` | 单 API | 无 | 远程 URL、本地 JSON/YAML 路径或 `file:` URL |
| `outputFolder` | 单 API | 当前 API 名称 | `outputDir` 下的输出子目录 |
| `label` | 单 API | 当前 API 名称 | 交互选择时显示的名称 |

`outputFolder` 必须位于 `outputDir` 内且不能等于 `outputDir`，避免整体替换时影响生成根目录或项目外文件。

## `service`

```ts
service: {
  importPath?: string
  importName?: string
  rootPath?: string
  rootPathSource?: 'gateway' | 'document'
}
```

- `importPath`：已配置 Service 所在的模块路径。
- `importName`：该模块导出的 Service 名称，必须是合法标识符。
- `rootPath`：存在时，`resource.ts` 使用 `service.with({ rootPath }).createApi`；否则直接使用 `service.createApi`。
- `rootPathSource`：决定 OpenAPI 路径是否已包含 `rootPath`。

最终合并结果中 `importPath` 和 `importName` 都必须存在。

`rootPathSource: 'gateway'` 表示前缀由网关在运行时添加，生成时不从文档路径移除；`document` 表示文档路径包含该前缀，生成时移除完整 `rootPath` 或能够匹配的最长尾部前缀。具体映射见 [生成规则](./generation-rules)。

## `responseSchema`

```ts
responseSchema: {
  namePrefix?: string
  dataField?: string
}
```

当成功响应类型名称以 `namePrefix` 开头时，生成器尝试将方法返回类型收窄为该模型的 `dataField` 字段类型。两项都允许配置为空字符串以关闭相应匹配条件。

## `generatorOptions`

该对象传递给 `swagger-typescript-api`。内置值为：

```ts
{
  modular: true,
  routeTypes: true,
  generateClient: true,
  moduleNameFirstTag: true,
  cleanOutput: true,
}
```

用户配置在其后覆盖。`templates` 可指定相对项目目录的自定义模板目录；目录无效时生成终止。

## `documentRequest`

```ts
documentRequest: {
  timeout?: number
  headers?: Record<string, string>
}
```

只用于远程 OpenAPI 文档请求。超时必须大于 0，默认 30 秒；请求头可用于文档鉴权。本地 `.json`、`.yaml`、`.yml` 直接从项目目录解析。

## 配置继承

`apis.<name>` 覆盖全局配置。其中 `service`、`responseSchema`、`generatorOptions`、`documentRequest` 按字段合并，`documentRequest.headers` 也按字段合并；其他字段按单 API 值覆盖。

```ts
apis: {
  workflow: {
    url: './openapi/workflow.yaml',
    service: {
      importName: 'workflowService',
    },
  },
}
```

## 重名策略

- `strip`：移除上游自动添加的数字后缀，打印冲突错误并继续生成；冲突方法名可能重复。
- `keep-suffix`：冲突方法保留数字后缀，打印警告并继续生成。
- `error`：发现冲突立即终止，正式输出目录保持不变。
