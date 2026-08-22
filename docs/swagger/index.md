# API Codegen

API Codegen 是 DataModel 的自动化生成工具。

它根据 Swagger / OpenAPI 文档生成：

- TypeScript 类型
- 业务 Api 模块
- Resource 请求代码
- 模块导出文件

生成结果遵循 DataModel 的 Resource → Api 模型。

## 配置

创建：

```text
api-datamodel.config.mjs
```

示例：

```js
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
      url: 'http://127.0.0.1:8080/v3/api-docs/sys',
      folder: 'sys',
    },
  },
}
```

## 生成

package.json：

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

也可以直接指定：

```bash
npx api-datamodel-swagger <文档地址> <输出目录> [业务前缀]
```

查看帮助：

```bash
npx api-datamodel-swagger --help
```

## 生成目录

推荐将生成代码作为接口文档的同步结果：

```text
src/api/
├─ sys/
│  ├─ User.ts
│  └─ index.ts
└─ dataModel.ts
```

不要直接在生成目录中编写业务逻辑，避免重新生成时覆盖。

## 注意

开启 `cleanOutput` 后会清理对应输出目录，请确认该目录只包含自动生成文件。
