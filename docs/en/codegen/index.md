# API Codegen

API Codegen is a companion tool for `api-datamodel` that converts Swagger/OpenAPI documents into TypeScript types and business APIs.

```text
OpenAPI
   ↓
API Codegen
   ↓
TypeScript Types + Business APIs
```

Generated output uses the [API Modeling](../guide/api-modeling) model from this guide rather than a separate request system.

## Workflow

### 1. Prepare a Service

First, export a configured Service from the application:

```ts
// src/api/dataModel.ts
import axios from 'axios'
import { createService } from 'api-datamodel'

export const service = createService({
  adapter: axios,
  baseUrl: '/api',
})
```

### 2. Create a Configuration File

Create `api-datamodel.config.ts` in the project root:

```ts
import defineConfig from 'api-datamodel/codegen/defineConfig.js'

export default defineConfig({
  outputDir: 'src/api',
  importStatement: "import { createApi } from '@/api/dataModel'",
  responseSchema: {
    namePrefix: 'AjaxResult',
    dataField: 'data',
  },
  apis: {
    sys: {
      url: 'https://example.com/openapi.json',
      outputFolder: 'sys',
    },
  },
})
```

### 3. Run the Command

```bash
api-datamodel-codegen sys
```

You can also specify a remote or local document and an output folder directly:

```bash
api-datamodel-codegen ./openapi.yaml local
api-datamodel-codegen https://example.com/openapi.json --output sys
```

Common options:

```text
-c, --config <path>   Specify the configuration file
-o, --output <dir>    Specify the output folder
-h, --help            Show help
```

### 4. Use the Generated API

By default, output is written to `src/api/<outputFolder>`:

```text
src/api/sys/
├─ data-contracts.ts
├─ <business-module>.ts
└─ index.ts
```

```ts
import { userApi } from '@/api/sys'

const users = await userApi.listUsers({ page: 1 })
```

The generated directory is a projection of the OpenAPI document. Do not maintain business extensions manually inside it.

## Default Generation Rules

Codegen first uses `swagger-typescript-api` to parse the document, then converts the upstream result into the existing Service and Business API model.

```text
OpenAPI Path
    ↓
Path Normalization
    ↓
Modules and Files
    ↓
Methods, Parameters, and Return Types
    ↓
Output Files
```

### Paths to Modules

The first business segment in the normalized path becomes `resourceName` and is passed to `createApi(resourceName, ...)` as `modulePath`:

```text
/user/list
   ↓
resourceName = user
modulePath   = user
requestPath  = /list
```

Module variable names and filenames are normally based on the first segment. If resources share the same first-level name and nested routes conflict, the generator combines the PascalCase form of the second segment to distinguish them, for example `userRoleApi`.

Tags participate in upstream module grouping by `swagger-typescript-api`, but the final business resource name is still derived from the normalized path. Tags and paths should describe the same business ownership.

### Request Paths

Each method's `requestPath` is the normalized path with the first `resourceName` removed. Path parameters remain template expressions:

```text
OpenAPI:     /user/{id}/roles
modulePath:  user
requestPath: /${id}/roles
```

At runtime, the complete URL is composed as `baseUrl + basePath + modulePath + requestPath`.

When OpenAPI paths include `basePath`, set `pathInDocument: true` so generated module names and `modulePath` values do not include that base path. See [`pathInDocument`](./config#pathindocument) for details.

### Method Names

`operationId` is the primary source of business method names. It should be valid, stable, and as globally unique as possible.

`swagger-typescript-api` appends numeric suffixes such as `_2` and `_3` to duplicate `operationId` values. Codegen then removes, keeps, or rejects them according to `duplicateMethodStrategy`. See [Duplicate-name Strategy](./config#duplicate-name-strategy).

### Parameters

- Path parameters become separate method arguments and are written into the request-path template.
- Query parameters become a query object.
- Request Body becomes the data argument.
- An optional Body or a model whose fields are all optional defaults to `{}`.
- Each method receives an optional final `config?: RequestConfig` argument.

The exact TypeScript parameter shape depends on the OpenAPI Schema and the result parsed by `swagger-typescript-api`.

### HTTP Methods

| OpenAPI Method | Generated call |
| --- | --- |
| GET | `$http.get()` |
| POST | `$http.post()` |
| PUT | `$http.put()` |
| DELETE | `$http.delete()` |
| PATCH, HEAD, OPTIONS | `$http.request()` with an explicit `method` |

When a non-GET convenience method has both Query and Body, Body is passed as the second argument and Query is written to `params` in the per-request configuration.

### Return Types

Return types come from OpenAPI `components.schemas` and the successful response Schema.

When the successful response type name matches `responseSchema.namePrefix`, the generator reads `responseSchema.dataField` from that type and narrows the business method's return type to the data field. For example:

```text
AjaxResultUser
      ↓ data
     User
```

If the wrapper model does not match or the target field cannot be found, the complete successful response type is used. See [`responseSchema`](./config#responseschema) for configuration.

### Module Files and Output Directories

Each `outputFolder` is generated independently:

- Type files such as `data-contracts.ts`.
- Business API files generated by module.
- `resource.ts`, generated when `service` is configured to derive and export `createApi` from the imported Service.
- `index.ts`, which exports every TypeScript module in the output directory.

The generator first writes to a temporary sibling directory, then replaces the official output directory only after everything succeeds. If replacement fails, it attempts to restore the previous directory. When `cleanOutput` is enabled, the output subdirectory should contain generated content only.

### Current Limitations

- When a successful response is parsed as `void`, the current template generates `$http.downloadFile()`, so ordinary business endpoints should not declare only an empty response.
- `multipart/form-data` does not currently generate `$http.upload()` automatically.
- Different OpenAPI download declarations can produce different upstream parsing results, so generated download methods must still be reviewed.
- Keep business composition and extension code outside the generated directory so regeneration does not overwrite it.

See [Configuration](./config) for every option and its impact, and [Backend Conventions](./backend-conventions) for producing stable documents from backend endpoints.
