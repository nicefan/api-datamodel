# API Codegen

API Codegen 是 `api-datamodel` 的附属工具，用于将 Swagger/OpenAPI 文档转换成 TypeScript 类型和业务 API。

```text
OpenAPI
   ↓
API Codegen
   ↓
TypeScript Types + Business APIs
```

生成结果仍然使用手册中的 [Service 与业务 API](../guide/service-api) 模型，不是另一套请求体系。

## 1. 准备 Service

业务项目先导出已经配置好的 Service：

```ts
// src/api/dataModel.ts
export const service = createService({
  adapter: fetchAdapter,
  serverUrl: '/api',
})
```

## 2. 创建配置文件

在项目根目录创建 `api-datamodel.config.ts`：

```ts
import defineConfig from 'api-datamodel/codegen/defineConfig.js'

export default defineConfig({
  outputDir: 'src/api',
  service: {
    importPath: '@/api/dataModel',
    importName: 'service',
  },
  apis: {
    sys: {
      url: 'https://example.com/openapi.json',
      outputFolder: 'sys',
    },
  },
})
```

## 3. 执行命令

```bash
api-datamodel-codegen sys
```

也可直接指定远程或本地文档和输出文件夹：

```bash
api-datamodel-codegen ./openapi.yaml local
api-datamodel-codegen https://example.com/openapi.json --output sys
```

常用选项：

```text
-c, --config <路径>  指定配置文件
-o, --output <目录>  指定输出文件夹
-h, --help           显示帮助
```

## 4. 使用生成 API

默认输出位于 `src/api/<outputFolder>`：

```text
src/api/sys/
├─ data-contracts.ts
├─ <业务模块>.ts
├─ resource.ts
└─ index.ts
```

```ts
import { userApi } from '@/api/sys'

const users = await userApi.list({ page: 1 })
```

生成目录是 OpenAPI 文档的投影，不要在其中手工维护业务扩展。完整配置见 [配置](./config)，映射行为见 [生成规则](./generation-rules)。
