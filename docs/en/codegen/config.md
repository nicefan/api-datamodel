# Codegen Configuration

Configuration controls how the generator reads OpenAPI documents, connects to an existing Service, and changes the [default generation rules](./#default-generation-rules).

## Configuration Files

Codegen searches in this order:

1. `api-datamodel.config.ts`
2. `api-datamodel.config.mts`
3. `api-datamodel.config.mjs`
4. `api-datamodel.config.js`
5. `api-datamodel.config.cts`
6. `api-datamodel.config.cjs`
7. `api-datamodel.config.json`

The configuration may also export a synchronous or asynchronous function that returns the configuration object. Use `--config` to specify another file.

## Complete Example

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
      label: 'System Management',
      url: 'https://example.com/openapi.json',
      outputFolder: 'sys',
    },
  },
})
```

## Configuration Overview

| Option | Scope | Default | Description |
| --- | --- | --- | --- |
| `outputDir` | Global or per API | `src/api` | Generation root, which must be inside the project directory |
| `importStatement` | Global or per API | None | Factory method or Service import statement |
| `service` | Global or per API | None | Service derivation and generated-path interpretation |
| `responseSchema` | Global or per API | `AjaxResult` + `data` | Rules for recognizing response wrapper models |
| `generatorOptions` | Global or per API | Built-in recommended options | Options passed to `swagger-typescript-api` |
| `documentRequest` | Global or per API | `timeout: 30000` | Timeout and headers for fetching remote documents |
| `duplicateMethodStrategy` | Global or per API | `strip` | Duplicate method-name strategy |
| `apis` | Global | None | Named collection of per-API configurations |
| `url` | Per API | None | Remote URL, local JSON/YAML path, or `file:` URL |
| `outputFolder` | Per API | Current API name | Output subdirectory under `outputDir` |
| `label` | Per API | Current API name | Label shown during interactive selection |

## Output and API Documents

### `outputDir` and `outputFolder`

`outputDir` is the generation root and `outputFolder` is the subdirectory for one API:

```text
outputDir: src/api
outputFolder: sys
        ↓
src/api/sys
```

`outputFolder` must be inside `outputDir` and cannot equal it. This prevents whole-directory replacement from affecting the generation root or files outside the project.

### `apis`, `url`, and `label`

`apis` organizes one or more OpenAPI sources by name:

```ts
apis: {
  sys: {
    label: 'System Management',
    url: './openapi/sys.yaml',
    outputFolder: 'sys',
  },
}
```

`url` may be a remote address, a local JSON/YAML file, or a `file:` URL. `label` affects only the text shown during interactive selection and does not change generated files or code.

## `importStatement` and `service`

```ts
importStatement: "import service from '@/api/dataModel'"
service: {
  basePath: string
  pathInDocument?: boolean
}
```

`importStatement` accepts one default import or one named import member. Without `service`, the imported binding is written directly into each business module as the factory method:

```ts
importStatement: "import { createApi } from '@/api/service'"
```

When `service` is configured, the imported binding is treated as a Service and `resource.ts` derives the factory through `with({ basePath })`. `basePath` must be a non-empty string.

### `basePath`

Generated `resource.ts` first derives a Service:

```ts
const apiService = service.with({ basePath: 'system' })
```

Business modules are then created through `createApi()` on the derived Service. The original Service is not changed.

### `pathInDocument`

Set this to `true` when OpenAPI paths begin with `basePath`. The generator excludes that base path before deriving the module name and `modulePath`. The default is `false`.

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

When the successful response type name begins with `namePrefix`, the generator tries to read `dataField` from that model and narrows the method return type to the business data:

```text
namePrefix: AjaxResult
dataField: data

AjaxResultUser
      ↓ data
     User
```

If the target field cannot be found, the complete response type is used. Either field may be an empty string to disable that matching condition.

## Duplicate-name Strategy

`swagger-typescript-api` appends numeric suffixes to duplicate `operationId` values. `duplicateMethodStrategy` controls how Codegen handles them:

```text
listUsers
listUsers_2
```

- `strip`: remove the upstream numeric suffix, report an error, and continue; the output may contain duplicate method names.
- `keep-suffix`: retain numeric suffixes on conflicting methods, report a warning, and continue.
- `error`: stop generation immediately; the official output directory remains unchanged.

The default is `strip`. Explicitly use `error` when generation should fail instead of possibly producing duplicate methods.

## `generatorOptions`

This object first affects upstream parsing and output from `swagger-typescript-api`, then affects subsequent conversion by `api-datamodel`. Built-in values are:

```ts
{
  modular: true,
  routeTypes: true,
  generateClient: true,
  moduleNameFirstTag: true,
  cleanOutput: true,
}
```

User configuration overrides these values. Changing upstream options can alter module grouping, types, and route structures, so verify the actual generated result.

`generatorOptions.templates` may specify a custom template directory relative to the project directory. Generation stops if that directory is invalid.

## `documentRequest`

```ts
documentRequest: {
  timeout?: number
  headers?: Record<string, string>
}
```

This configuration is used only to fetch remote OpenAPI documents. The timeout must be greater than zero and defaults to 30 seconds. Headers can authenticate document requests. Local `.json`, `.yaml`, and `.yml` files are resolved directly from the project directory and do not use this request configuration.

## Configuration Inheritance and Overrides

`apis.<name>` overrides global configuration. Within it, `service`, `responseSchema`, `generatorOptions`, and `documentRequest` are merged by field; `documentRequest.headers` is also merged by field. Other options use the per-API value as a direct override.

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
      url: './openapi/workflow.yaml',
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

The final `workflow` configuration inherits the global import statement, overrides `basePath`, and retains both document request headers.
