import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

const generatorPath = path.resolve('codegen/main.js')

function runGenerator(args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [generatorPath, ...args], { cwd })
    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => {
      stdout += chunk
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })
    child.on('error', reject)
    child.on('exit', (code) => resolve({ code, stderr, stdout }))
  })
}

test('API Codegen help shows the public command name', async () => {
  const result = await runGenerator(['--help'], process.cwd())

  assert.equal(result.code, 0, result.stderr || result.stdout)
  assert.match(result.stdout, /^API Codegen/m)
  assert.match(result.stdout, /api-datamodel-codegen <文档地址> <输出文件夹>/)
  assert.doesNotMatch(result.stdout, /api-datamodel-swagger/)
})

test('API Codegen reads named business-project configuration', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'api-datamodel-codegen-config-'))
  const spec = {
    openapi: '3.0.0',
    info: { title: 'Config test', version: '1.0.0' },
    paths: {
      '/users': {
        get: {
          operationId: 'listUsers',
          tags: ['Users'],
          responses: {
            200: {
              description: 'ok',
              content: {
                'application/json': {
                  schema: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
      },
      '/users/detail': {
        get: {
          operationId: 'getUser',
          tags: ['Users'],
          responses: {
            200: {
              description: 'ok',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApiResponseUser' },
                },
              },
            },
          },
        },
      },
      '/users/update': {
        patch: {
          operationId: 'updateUser',
          tags: ['Users'],
          responses: {
            200: {
              description: 'ok',
              content: {
                'application/json': {
                  schema: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        ApiResponseUser: {
          type: 'object',
          properties: {
            result: { type: 'string' },
          },
        },
      },
    },
  }
  const server = http.createServer((_request, response) => {
    response.setHeader('content-type', 'application/json')
    response.end(JSON.stringify(spec))
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))

  try {
    const url = `http://127.0.0.1:${server.address().port}/openapi.json`
    const config = {
      outputDir: 'generated/clients',
      generatorOptions: { cleanOutput: true },
      responseSchema: { namePrefix: 'ApiResponse', dataField: 'result' },
      service: { importPath: '@/api/service', importName: 'service', rootPath: 'admin' },
      apis: {
        system: {
          url,
          outputFolder: 'system',
        },
      },
    }
    await writeFile(path.join(tempDir, 'api-datamodel.config.mjs'), `export default ${JSON.stringify(config)}`)

    const result = await runGenerator(['system'], tempDir)
    assert.equal(result.code, 0, result.stderr || result.stdout)
    assert.equal(result.stdout.split(/\r?\n/)[0], `配置文件：${path.join(tempDir, 'api-datamodel.config.mjs')}`)

    const generated = await readFile(path.join(tempDir, 'generated/clients/system/Users.ts'), 'utf8')
    assert.match(generated, /import createApi from "\.\/resource"/)
    assert.match(generated, /createApi\("users"/)
    assert.match(generated, /listUsers\(/)
    assert.match(generated, /return this\.\$http\.get/)
    assert.match(generated, /getUser\(/)
    assert.match(generated, /return this\.\$http\.get<string>/)
    assert.match(generated, /return this\.\$http\.request<boolean>\(`\/update`, \{ \.\.\.config, method: "PATCH" \}\)/)
    assert.doesNotMatch(generated, /ApiResponseUser/)
    const resource = await readFile(path.join(tempDir, 'generated/clients/system/resource.ts'), 'utf8')
    assert.match(resource, /import \{ service \} from "@\/api\/service"/)
    assert.match(resource, /export default service\.with\(\{ rootPath: "admin" \}\)\.createApi/)
  } finally {
    await new Promise((resolve) => server.close(resolve))
    await rm(tempDir, { recursive: true, force: true })
  }
})

test('API Codegen strips a full or matching suffix resource prefix before naming modules', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'api-datamodel-codegen-prefix-'))
  const spec = {
    openapi: '3.0.0',
    info: { title: 'Prefix test', version: '1.0.0' },
    paths: {
      '/v1/users/list': {
        get: {
          operationId: 'listUsers',
          tags: ['Users'],
          responses: {
            200: {
              description: 'ok',
              content: {
                'application/json': {
                  schema: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
      },
      '/api/v1/orders/list': {
        get: {
          operationId: 'listOrders',
          tags: ['Orders'],
          responses: {
            200: {
              description: 'ok',
              content: {
                'application/json': {
                  schema: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
      },
    },
  }
  const server = http.createServer((_request, response) => {
    response.setHeader('content-type', 'application/json')
    response.end(JSON.stringify(spec))
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))

  try {
    const url = `http://127.0.0.1:${server.address().port}/openapi.json`
    const config = {
      outputDir: 'generated/clients',
      service: {
        importPath: '@/api/service',
        importName: 'service',
        rootPath: 'api/v1',
        rootPathSource: 'document',
      },
      apis: {
        system: {
          url,
          outputFolder: 'system',
        },
      },
    }
    await writeFile(path.join(tempDir, 'api-datamodel.config.mjs'), `export default ${JSON.stringify(config)}`)

    const result = await runGenerator(['system'], tempDir)
    assert.equal(result.code, 0, result.stderr || result.stdout)

    const generated = await readFile(path.join(tempDir, 'generated/clients/system/Users.ts'), 'utf8')
    assert.match(generated, /createApi\("users"/)
    assert.doesNotMatch(generated, /createApi\("v1/)
    assert.match(generated, /get<string\[\]>/)

    const fullPrefixGenerated = await readFile(
      path.join(tempDir, 'generated/clients/system/Orders.ts'),
      'utf8'
    )
    assert.match(fullPrefixGenerated, /createApi\("orders"/)
    assert.doesNotMatch(fullPrefixGenerated, /createApi\("api/)
  } finally {
    await new Promise((resolve) => server.close(resolve))
    await rm(tempDir, { recursive: true, force: true })
  }
})

test('API Codegen creates a local service module when importPath is configured', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'api-datamodel-codegen-resource-'))
  const spec = {
    openapi: '3.0.0',
    info: { title: 'Resource import test', version: '1.0.0' },
    paths: {
      '/users': {
        get: {
          operationId: 'listUsers',
          tags: ['Users'],
          responses: { 200: { description: 'ok' } },
        },
      },
    },
  }
  const server = http.createServer((_request, response) => {
    response.setHeader('content-type', 'application/json')
    response.end(JSON.stringify(spec))
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))

  try {
    const url = `http://127.0.0.1:${server.address().port}/openapi.json`
    const config = {
      outputDir: 'generated/clients',
      apis: {
        system: {
          url,
          service: { importPath: '@/api/services', importName: 'systemService', rootPath: 'admin' },
        },
      },
    }
    await writeFile(path.join(tempDir, 'api-datamodel.config.mjs'), `export default ${JSON.stringify(config)}`)

    const result = await runGenerator(['system'], tempDir)
    assert.equal(result.code, 0, result.stderr || result.stdout)

    const generated = await readFile(path.join(tempDir, 'generated/clients/system/Users.ts'), 'utf8')
    assert.match(generated, /import createApi from "\.\/resource"/)
    assert.doesNotMatch(generated, /systemService/)

    const resource = await readFile(path.join(tempDir, 'generated/clients/system/resource.ts'), 'utf8')
    assert.match(resource, /import \{ systemService \} from "@\/api\/services"/)
    assert.match(resource, /export default systemService\.with\(\{ rootPath: "admin" \}\)\.createApi/)
  } finally {
    await new Promise((resolve) => server.close(resolve))
    await rm(tempDir, { recursive: true, force: true })
  }
})

test('API Codegen loads a TypeScript configuration directly', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'api-datamodel-codegen-ts-config-'))
  const spec = {
    openapi: '3.0.0',
    info: { title: 'TypeScript config test', version: '1.0.0' },
    paths: {},
  }
  const server = http.createServer((_request, response) => {
    response.setHeader('content-type', 'application/json')
    response.end(JSON.stringify(spec))
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))

  try {
    const url = `http://127.0.0.1:${server.address().port}/openapi.json`
    await writeFile(
      path.join(tempDir, 'api-datamodel.config.ts'),
      `type ApiName = 'system'\nconst name: ApiName = 'system'\nexport default { service: { importPath: '@/api/services', importName: 'service' }, apis: { [name]: { url: ${JSON.stringify(url)} } } }`
    )

    const result = await runGenerator(['system'], tempDir)
    assert.equal(result.code, 0, result.stderr || result.stdout)
    assert.equal(result.stdout.split(/\r?\n/)[0], `配置文件：${path.join(tempDir, 'api-datamodel.config.ts')}`)
    const resource = await readFile(path.join(tempDir, 'src/api/system/resource.ts'), 'utf8')
    assert.match(resource, /export default service\.createApi/)
    assert.doesNotMatch(resource, /service\.with/)
  } finally {
    await new Promise((resolve) => server.close(resolve))
    await rm(tempDir, { recursive: true, force: true })
  }
})

test('API Codegen reports a friendly business error returned by the document endpoint', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'api-datamodel-codegen-error-'))
  const server = http.createServer((_request, response) => {
    response.setHeader('content-type', 'application/json')
    response.end(JSON.stringify({ code: 500, message: '系统异常', data: null }))
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))

  try {
    const url = `http://127.0.0.1:${server.address().port}/openapi.json`
    await writeFile(
      path.join(tempDir, 'api-datamodel.config.mjs'),
      `export default ${JSON.stringify({ apis: { system: { url } } })}`
    )

    const result = await runGenerator(['system'], tempDir)
    assert.equal(result.code, 1)
    assert.match(result.stderr, /响应内容不是有效的 Swagger\/OpenAPI 文档/)
    assert.match(result.stderr, /接口返回业务错误（错误码：500）：系统异常/)
    assert.doesNotMatch(result.stderr, /Unsupported swagger\/OpenAPI version: undefined/)
  } finally {
    await new Promise((resolve) => server.close(resolve))
    await rm(tempDir, { recursive: true, force: true })
  }
})

test('API Codegen reports HTTP and invalid JSON document errors clearly', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'api-datamodel-codegen-http-error-'))
  let mode = 'http-error'
  const server = http.createServer((_request, response) => {
    if (mode === 'http-error') {
      response.statusCode = 503
      response.end('service unavailable')
      return
    }
    response.end('<html>login required</html>')
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))

  try {
    const url = `http://127.0.0.1:${server.address().port}/openapi.json`
    await writeFile(
      path.join(tempDir, 'api-datamodel.config.mjs'),
      `export default ${JSON.stringify({ apis: { system: { url } } })}`
    )

    const httpResult = await runGenerator(['system'], tempDir)
    assert.equal(httpResult.code, 1)
    assert.match(httpResult.stderr, /Swagger 文档请求失败（HTTP 503 Service Unavailable）：service unavailable/)

    mode = 'invalid-json'
    const jsonResult = await runGenerator(['system'], tempDir)
    assert.equal(jsonResult.code, 1)
    assert.match(jsonResult.stderr, /Swagger 文档不是有效的 JSON：<html>login required<\/html>/)
  } finally {
    await new Promise((resolve) => server.close(resolve))
    await rm(tempDir, { recursive: true, force: true })
  }
})

test('API Codegen accepts local YAML documents and rejects unknown CLI options', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'api-datamodel-codegen-yaml-'))
  try {
    const documentPath = path.join(tempDir, 'openapi.yaml')
    await writeFile(
      path.join(tempDir, 'api-datamodel.config.mjs'),
      `export default { service: { importPath: '@/api/services', importName: 'service' } }`
    )
    await writeFile(
      documentPath,
      'openapi: 3.0.0\ninfo:\n  title: Local YAML\n  version: 1.0.0\npaths: {}\n'
    )
    const result = await runGenerator([documentPath, 'local'], tempDir)
    assert.equal(result.code, 0, result.stderr || result.stdout)
    assert.match(await readFile(path.join(tempDir, 'src/api/local/resource.ts'), 'utf8'), /service\.createApi/)

    const invalidOption = await runGenerator(['--unknown'], tempDir)
    assert.equal(invalidOption.code, 1)
    assert.match(invalidOption.stderr, /未知选项：--unknown/)
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
})

test('API Codegen sends configured headers when loading a remote document', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'api-datamodel-codegen-headers-'))
  const spec = { openapi: '3.0.0', info: { title: 'Headers', version: '1.0.0' }, paths: {} }
  const server = http.createServer((request, response) => {
    if (request.headers['x-api-key'] !== 'secret') {
      response.statusCode = 401
      response.end('unauthorized')
      return
    }
    response.setHeader('content-type', 'application/json')
    response.end(JSON.stringify(spec))
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    const config = {
      documentRequest: { timeout: 1000, headers: { 'x-api-key': 'secret' } },
      service: { importPath: '@/api/services', importName: 'service' },
      apis: { system: { url: `http://127.0.0.1:${server.address().port}/openapi.json` } },
    }
    await writeFile(path.join(tempDir, 'api-datamodel.config.mjs'), `export default ${JSON.stringify(config)}`)
    const result = await runGenerator(['system'], tempDir)
    assert.equal(result.code, 0, result.stderr || result.stdout)
  } finally {
    await new Promise((resolve) => server.close(resolve))
    await rm(tempDir, { recursive: true, force: true })
  }
})

test('API Codegen preserves existing output when duplicate method strategy stops generation', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'api-datamodel-codegen-atomic-'))
  const spec = {
    openapi: '3.0.0',
    info: { title: 'Duplicate methods', version: '1.0.0' },
    paths: {
      '/users/one': {
        get: { operationId: 'getUser', tags: ['Users'], responses: { 200: { description: 'ok' } } },
      },
      '/users/two': {
        get: { operationId: 'getUser', tags: ['Users'], responses: { 200: { description: 'ok' } } },
      },
    },
  }
  const server = http.createServer((_request, response) => {
    response.setHeader('content-type', 'application/json')
    response.end(JSON.stringify(spec))
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    const outputDir = path.join(tempDir, 'generated/clients/system')
    await mkdir(outputDir, { recursive: true })
    await writeFile(path.join(outputDir, 'keep.txt'), 'old output')
    const config = {
      outputDir: 'generated/clients',
      duplicateMethodStrategy: 'error',
      apis: { system: { url: `http://127.0.0.1:${server.address().port}/openapi.json` } },
    }
    await writeFile(path.join(tempDir, 'api-datamodel.config.mjs'), `export default ${JSON.stringify(config)}`)
    const result = await runGenerator(['system'], tempDir)
    assert.equal(result.code, 1)
    assert.match(result.stderr, /接口命名冲突/)
    assert.equal(await readFile(path.join(outputDir, 'keep.txt'), 'utf8'), 'old output')
  } finally {
    await new Promise((resolve) => server.close(resolve))
    await rm(tempDir, { recursive: true, force: true })
  }
})
