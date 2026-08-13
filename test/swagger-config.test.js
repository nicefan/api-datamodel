import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

const generatorPath = path.resolve('swagger/main.js')

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

test('swagger generator reads named business-project configuration', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'api-datamodel-swagger-config-'))
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
      output: 'generated/clients',
      httpPath: '~/request',
      generator: { cleanOutput: true },
      apis: {
        system: {
          url,
          folder: 'system',
          prePath: 'admin',
          httpModule: 'makeApi',
        },
      },
    }
    await writeFile(path.join(tempDir, 'api-datamodel.config.mjs'), `export default ${JSON.stringify(config)}`)

    const result = await runGenerator(['system'], tempDir)
    assert.equal(result.code, 0, result.stderr || result.stdout)
    assert.match(result.stdout, /已使用配置/)

    const generated = await readFile(path.join(tempDir, 'generated/clients/system/Users.ts'), 'utf8')
    assert.match(generated, /import \{ makeApi \} from "~\/request"/)
    assert.match(generated, /makeApi\("admin\/users"/)
    assert.match(generated, /listUsers\(/)
  } finally {
    await new Promise((resolve) => server.close(resolve))
    await rm(tempDir, { recursive: true, force: true })
  }
})
