import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

import { ApiResource, CacheResult, Http, buildAdapter, setLoadingServe } from '../dist/index.js'

test('API Codegen defineConfig module has a default export and configuration types', async () => {
  const { default: defineConfig } = await import('../codegen/defineConfig.js')
  const declarations = await readFile(new URL('../codegen/defineConfig.d.ts', import.meta.url), 'utf8')
  const configDeclarations = await readFile(new URL('../codegen/config.d.ts', import.meta.url), 'utf8')

  assert.equal(typeof defineConfig, 'function')
  assert.deepEqual(defineConfig({ apis: {} }), { apis: {} })
  assert.match(declarations, /export type \{ CodegenApiConfig, CodegenConfig \}/)
  assert.match(configDeclarations, /interface CodegenApiConfig/)
  assert.match(configDeclarations, /interface CodegenConfig/)
})

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

test('public entry no longer exports BaseInfo or BaseList APIs', async () => {
  const api = await import('../dist/index.js')

  for (const name of ['BaseInfo', 'BaseList', 'infoExtend', 'pagesExtend']) {
    assert.equal(name in api, false)
  }
})

test('an overridden resource method calls the transport through $http', async () => {
  let requestConfig
  const userApi = ApiResource.create(
    'user',
    {
      delete(id, config) {
        return this.$http.delete(`/delete/${id}`, undefined, config)
      },
    },
    {
      adapter: async (config) => {
        requestConfig = config
        return { data: true }
      },
    }
  )

  assert.equal(await userApi.delete('42', { silent: true }), true)
  assert.equal(requestConfig.url, '/user/delete/42')
  assert.equal(requestConfig.method, 'DELETE')
})

test('$http remains isolated when business methods override request methods', async () => {
  const requests = []
  const userApi = ApiResource.create(
    'user',
    {
      request(id) {
        return this.$http.get(`/${id}`, undefined, { silent: true })
      },
      post(data) {
        return this.$http.post('/save', data, { silent: true })
      },
    },
    {
      adapter: async (config) => {
        requests.push(config)
        return { data: config.url }
      },
    }
  )

  assert.equal(await userApi.request('42'), '/user/42')
  assert.equal(await userApi.post({ name: 'Joe' }), '/user/save')
  assert.equal(await userApi.$http.get('/list', undefined, { silent: true }), '/user/list')
  assert.deepEqual(
    requests.map(({ method }) => method),
    ['GET', 'POST', 'GET']
  )
})

test('$http requests expose setMessage on the request instance', async () => {
  const userApi = ApiResource.create(
    'user',
    {
      save() {
        return this.$http.post('/save', {}, { silent: true }).then((result) => {
          this.$http.setMessage('保存成功')
          return result
        })
      },
    },
    { adapter: async () => ({ data: true }) }
  )

  await userApi.save()
  assert.equal(typeof userApi.$http.setMessage, 'function')
  assert.doesNotThrow(() => userApi.$http.setMessage('保存成功'))
})

test('$http.abort stops all pending requests for the resource', async () => {
  const signals = []
  const userApi = ApiResource.create('user', {}, {
    adapter: (config) =>
      new Promise((resolve, reject) => {
        signals.push(config.signal)
        config.signal.addEventListener('abort', () => reject(config.signal.reason), { once: true })
      }),
  })

  const first = userApi.$http.get('/first', undefined, { silent: true })
  const second = userApi.$http.get('/second', undefined, { silent: true })
  userApi.$http.abort('用户取消')

  await assert.rejects(first, (reason) => reason === '用户取消')
  await assert.rejects(second, (reason) => reason === '用户取消')
  assert.equal(signals.every((signal) => signal.aborted), true)
})

test('an external signal can abort a request managed by $http', async () => {
  let adapterSignal
  const userApi = ApiResource.create('user', {}, {
    adapter: (config) =>
      new Promise((resolve, reject) => {
        adapterSignal = config.signal
        config.signal.addEventListener('abort', () => reject(config.signal.reason), { once: true })
      }),
  })
  const controller = new AbortController()
  const request = userApi.$http.get('/pending', undefined, {
    silent: true,
    signal: controller.signal,
  })

  controller.abort('外部取消')

  await assert.rejects(request, (reason) => reason === '外部取消')
  assert.notEqual(adapterSignal, controller.signal)
  assert.equal(adapterSignal.aborted, true)
})

test('non-function resource extensions are preserved', () => {
  const userApi = ApiResource.create('user', { list: 'get' }, { adapter: async () => ({ data: [] }) })

  assert.equal(userApi.list, 'get')
  assert.equal(typeof userApi.$http.get, 'function')
})

test('cache map uses the explicitly configured record key field', async () => {
  const records = [
    { id: 0, name: 'zero' },
    { id: 2, name: 'two' },
  ]
  const cache = new CacheResult({ request: async () => records, keyField: 'id' })

  assert.deepEqual(await cache.getMap(), {
    0: records[0],
    2: records[1],
  })
})

test('cache map is invalidated after a reload', async () => {
  let version = 1
  const cache = new CacheResult({
    request: async () => [{ id: 1, version: version++ }],
    keyField: 'id',
  })

  assert.equal((await cache.getMap())[1].version, 1)
  await delay(1050)
  await cache.reload()

  assert.equal((await cache.getMap())[1].version, 2)
})

test('cross-platform upload and download failures reject', async () => {
  const uploadError = new Error('upload failed')
  const downloadError = new Error('download failed')
  const adapter = buildAdapter({
    uploadFile({ fail }) {
      fail(uploadError)
    },
    downloadFile({ fail }) {
      fail(downloadError)
    },
  })

  await assert.rejects(
    adapter({
      url: '/upload',
      data: { filePath: '/tmp/file', fileKey: 'file' },
      headers: { 'content-type': 'multipart/form-data' },
    }),
    uploadError
  )
  await assert.rejects(adapter({ url: '/download', responseType: 'blob', headers: {} }), downloadError)
})

test('download filename parsing supports plain and RFC 5987 headers', async () => {
  const headers = []
  const resource = new ApiResource('/files', {
    adapter: async () => ({
      data: 'blob',
      headers: { 'content-disposition': headers.shift() },
    }),
  })

  headers.push('attachment; filename="100%.csv"')
  assert.equal((await resource.downloadFile('report', { silent: true })).filename, '100%.csv')

  headers.push("attachment; filename*=UTF-8''%E6%8A%A5%E5%91%8A.csv")
  assert.equal((await resource.downloadFile('report', { silent: true })).filename, '报告.csv')

  headers.push("attachment; filename*=UTF-8''report%3Bfinal.csv")
  assert.equal((await resource.downloadFile('report', { silent: true })).filename, 'report;final.csv')

})

test('cross-platform adapter aborts its request task when signaled', async () => {
  let aborted = false
  const adapter = buildAdapter({
    request() {
      return {
        abort() {
          aborted = true
        },
      }
    },
  })
  const controller = new AbortController()
  const request = adapter({ url: '/pending', headers: {}, signal: controller.signal })

  controller.abort('用户取消')

  await assert.rejects(request, (reason) => reason === '用户取消')
  assert.equal(aborted, true)
})

test('cache map does not infer id as the record key field', async () => {
  const cache = new CacheResult(async () => [{ id: 1, name: 'one' }])

  assert.equal(await cache.getMap(), undefined)
})

test('cache recognizes standard dictionaries or explicitly configured dictionary fields', async () => {
  const records = [{ value: 'enabled', label: '启用' }]
  const inferred = new CacheResult(async () => records)
  const configured = new CacheResult({
    request: async () => records,
    keyField: 'value',
    labelField: 'label',
  })

  assert.deepEqual(await inferred.getMap(), { enabled: '启用' })
  assert.deepEqual(await inferred.getResult(), records)
  assert.deepEqual(await configured.getMap(), { enabled: '启用' })
  assert.deepEqual(await configured.getResult(), [
    { original: records[0], value: 'enabled', label: '启用' },
  ])
})

test('labelField alone is ignored and does not look for value or id', async () => {
  const records = [{ value: 'enabled', name: '启用', id: 1 }]
  const cache = new CacheResult({ request: async () => records, labelField: 'name' })

  assert.equal(await cache.getMap(), undefined)
  assert.deepEqual(await cache.getResult(), records)
})

test('a new request cancels the previous batch delayed loading close', async () => {
  const pending = []
  let closeCount = 0
  setLoadingServe({
    show() {},
    close() {
      closeCount++
    },
  })
  const http = new Http({
    adapter: () => new Promise((resolve) => pending.push(resolve)),
  })

  const first = http.get('/first')
  await delay(220)
  pending.shift()({ data: {} })
  await first
  await delay(20)

  const second = http.get('/second')
  await delay(110)
  assert.equal(closeCount, 0)

  pending.shift()({ data: {} })
  await second
  await delay(120)
  assert.equal(closeCount, 1)
})
