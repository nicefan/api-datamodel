# SwaggerGen

SwaggerGen 用于把 DataModel 应用到接口自动化管理，根据 Swagger / OpenAPI 文档生成 TypeScript 类型和业务 Api。

## 配置

推荐在项目根目录创建：

```text
api-datamodel.config.mjs
```

```js
/** @type {import('api-datamodel/swagger/config').ApiDatamodelConfig} */
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
      url: 'http://127.0.0.1:8080/v3/api-docs/系统管理',
      folder: 'sys',
    },
  },
}
```

## 生成命令

在 `package.json` 中加入：

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

也可以直接传入文档地址：

```bash
npx api-datamodel-swagger <文档地址> <输出目录> [业务前缀]
```

查看完整帮助：

```bash
npx api-datamodel-swagger --help
```

::: warning
开启 `cleanOutput` 后会清理对应输出目录，不要在自动生成目录中手写业务代码。
:::
