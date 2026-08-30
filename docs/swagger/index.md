# API Codegen

API Codegen 根据 Swagger/OpenAPI 文档生成 TypeScript 数据类型和业务 API，并通过已配置的 Service 接入运行时。

```text
Swagger/OpenAPI → 数据类型与 API 模块 → Service.createApi → 业务调用
```

## 安装与命令

安装 `api-datamodel` 后可使用：

```bash
api-datamodel-codegen
api-datamodel-codegen sys
api-datamodel-codegen ./openapi.yaml sys
api-datamodel-codegen https://example.com/openapi.json --output sys
```

常用选项：

```text
-c, --config <路径>  指定配置文件
-o, --output <目录>  指定输出文件夹
-h, --help           显示帮助
```

## 配置文件

推荐在项目根目录创建 `api-datamodel.config.ts`：

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
      url: 'http://127.0.0.1:8080/v3/api-docs/系统管理',
      outputFolder: 'sys',
    },
  },
})
```

`service.importPath` 与 `service.importName` 分别指定 Service 的导入路径和导出名称，最终合并配置中两者都必须存在。

- 未设置 `rootPath` 时，生成的 `resource.ts` 导出 `service.createApi`。
- 设置 `rootPath` 时，生成的 `resource.ts` 导出 `service.with({ rootPath }).createApi`。

## 配置项

| 配置项 | 使用位置 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `outputDir` | 全局或单接口 | `src/api` | 生成根目录 |
| `service` | 全局或单接口 | `rootPathSource: 'gateway'` | Service 导入和派生路径配置 |
| `responseSchema` | 全局或单接口 | `AjaxResult` + `data` | 响应包装模型规则 |
| `generatorOptions` | 全局或单接口 | 内置配置 | 传递给 `swagger-typescript-api` |
| `documentRequest` | 全局或单接口 | `timeout: 30000` | 远程文档请求参数 |
| `duplicateMethodStrategy` | 全局或单接口 | `strip` | 方法重名处理策略 |
| `url` | 单接口 | 无 | 远程地址或本地 JSON/YAML 路径 |
| `outputFolder` | 单接口 | 配置名称 | 生成根目录下的输出子目录 |
| `label` | 单接口 | 配置名称 | 交互选择时显示的名称 |

单接口配置覆盖全局配置；`service`、`responseSchema`、`generatorOptions` 和 `documentRequest` 按各自字段合并。

Codegen 默认按顺序查找 `api-datamodel.config.ts`、`.mts`、`.mjs`、`.js`、`.cts`、`.cjs` 和 `.json`。

## 路径与模块

最终请求路径由运行时组合：

```text
serverUrl + rootPath + modulePath + requestPath
```

`service.rootPathSource` 决定生成时如何解释 `rootPath`：

- `gateway`：`rootPath` 由网关提供，不从文档路径移除。
- `document`：从文档路径开头移除完整 `rootPath`，或能匹配的最长尾部路径。

例如 `rootPath: 'api/v1'` 可处理以 `/api/v1` 或 `/v1` 开头的文档路径。

## 方法与参数生成

- `operationId` 生成业务方法名，应保持合法、稳定且唯一。
- Path 参数生成独立方法参数。
- Query 参数生成查询对象。
- Request body 生成数据参数。
- 类型来自 OpenAPI `components.schemas`。

HTTP 方法映射：

| HTTP 方法 | 生成调用 |
| --- | --- |
| GET | `$http.get()` |
| POST | `$http.post()` |
| PUT | `$http.put()` |
| DELETE | `$http.delete()` |
| PATCH、HEAD、OPTIONS | `$http.request()` |

## 响应模型

当响应模型名称以 `responseSchema.namePrefix` 开头，且包含 `responseSchema.dataField` 字段时，生成的方法返回该字段的业务数据类型。

```ts
responseSchema: {
  namePrefix: 'AjaxResult',
  dataField: 'data',
}
```

接口成功响应应声明明确的 JSON Schema。无业务返回值的成功响应会生成 `$http.downloadFile()`，适合下载接口。`multipart/form-data` 不会自动生成 `$http.upload()`，上传接口可在业务扩展中显式调用。

## 方法重名策略

- `strip`：移除自动数字后缀，报告冲突并继续生成。
- `keep-suffix`：保留数字后缀，报告警告并继续生成。
- `error`：发现冲突后终止，本次不替换正式输出目录。

## 输出目录

每个 `outputFolder` 会生成独立模块和 `resource.ts` Service 桥接文件。生成器只允许替换 `outputDir` 内部且不等于 `outputDir` 的子目录；开启 `cleanOutput` 时，应确保输出子目录只包含生成内容。

建议将业务扩展放在生成目录之外，通过组合生成的 API 使用，避免手工编辑生成文件。
