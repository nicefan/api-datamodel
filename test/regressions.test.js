import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { createApiFactoryContent, parseImportStatement } from '../codegen/api-factory-template.js'

import {
  Http,
  Resource,
  buildAdapter,
  createService,
  fetchAdapter,
  setRequestHooks,
} from '../dist/index.js'

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

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

test('API Codegen extracts default and named imports and derives a service factory', async () => {
  assert.equal(parseImportStatement("import createApi from '@/api/service'").importName, 'createApi')
  const importConfig = parseImportStatement('import { systemService } from "@/api/services"')
  const rooted = createApiFactoryContent(importConfig, { basePath: 'admin' })

  assert.match(rooted, /import \{ systemService \} from "@\/api\/services"/)
  assert.match(rooted, /export default systemService\.with\(\{ basePath: "admin" \}\)\.createApi/)
})

test('fetch adapter maps query parameters and normalizes a JSON response', async () => {
  const originalFetch = globalThis.fetch
  let request
  globalThis.fetch = async (url, init) => {
    request = { url, init }
    return new Response(JSON.stringify({ value: 1 }), {
      status: 200,
      headers: { 'x-request-id': 'request-1' },
    })
  }

  try {
    const response = await fetchAdapter({
      url: '/users?active=true#list',
      method: 'GET',
      params: { role: ['admin', 'owner'], empty: null },
      withCredentials: true,
    })

    assert.equal(request.url, '/users?active=true&role=admin&role=owner#list')
    assert.equal(request.init.credentials, 'include')
    assert.deepEqual(response.data, { value: 1 })
    assert.equal(response.headers['x-request-id'], 'request-1')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('fetch adapter serializes JSON and leaves FormData content type to Fetch', async () => {
  const originalFetch = globalThis.fetch
  const requests = []
  globalThis.fetch = async (url, init) => {
    requests.push({ url, init })
    return new Response('{}', { status: 200 })
  }

  try {
    await fetchAdapter({ url: '/json', method: 'POST', data: { name: 'Joe' } })
    const formData = new FormData()
    formData.append('name', 'Joe')
    await fetchAdapter({
      url: '/form',
      method: 'POST',
      data: formData,
      headers: { 'content-type': 'multipart/form-data' },
    })

    assert.equal(requests[0].init.body, JSON.stringify({ name: 'Joe' }))
    assert.equal(requests[0].init.headers.get('content-type'), 'application/json')
    assert.equal(requests[1].init.body, formData)
    assert.equal(requests[1].init.headers.has('content-type'), false)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('fetch adapter rejects HTTP errors with normalized response data', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ message: 'invalid' }), { status: 400, statusText: 'Bad Request' })

  try {
    await assert.rejects(fetchAdapter({ url: '/invalid' }), (error) => {
      assert.equal(error.code, 400)
      assert.equal(error.status, 400)
      assert.deepEqual(error.response.data, { message: 'invalid' })
      return true
    })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('fetch adapter applies request timeout through AbortSignal', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (url, init) =>
    new Promise((resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true })
    })

  try {
    await assert.rejects(fetchAdapter({ url: '/slow', timeout: 5 }), /Request timeout after 5ms/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('public entry exposes the new runtime API and removes legacy entry points', async () => {
  const api = await import('../dist/index.js')

  for (const name of ['Http', 'Resource', 'createService', 'setRequestHooks', 'defineConfig']) {
    assert.equal(name in api, true)
  }
  for (const name of ['ApiResource', 'serviceInit', 'setGlobalConfig', 'setLoadingServe']) {
    assert.equal(name in api, false)
  }
})

test('service composes normalized paths and with creates an independent configuration', async () => {
  const urls = []
  const adapter = async (config) => {
    urls.push(config.url)
    return { data: config.url }
  }
  const service = createService({ adapter, baseUrl: '/api/', basePath: '/v1/' })
  const derived = service.with({ basePath: 'v2' })
  const twiceDerived = derived.with({ baseUrl: '/system-api' })

  await service.createApi('user', {}).$http.get('/list/', undefined, { silent: true })
  await derived.createApi('user', {}).$http.get('list', undefined, { silent: true })
  await service.http.get('health', undefined, { silent: true })
  await service.createApi({}).$http.get('status', undefined, { silent: true })

  assert.deepEqual(urls, ['/api/v1/user/list', '/api/v2/user/list', '/api/v1/health', '/api/v1/status'])
  assert.notEqual(service.http, derived.http)
  assert.equal(service.http instanceof Http, true)
  assert.equal(service.http instanceof Resource, true)
  assert.equal(Object.getPrototypeOf(service.http.constructor.prototype), Resource.prototype)
  assert.equal(Object.getPrototypeOf(derived.http.constructor.prototype), Resource.prototype)
  assert.equal(Object.getPrototypeOf(twiceDerived.http.constructor.prototype), Resource.prototype)
})

test('Resource.createService exposes isolated Resource instances through $http only', () => {
  assert.equal(Resource.createService, Http.createService)
  const service = Resource.createService({ adapter: async () => ({ data: true }) })
  const createApi = service.createApi
  const first = createApi('user', { list: 'get' })
  const second = service.createApi('user', {})

  assert.equal(Object.getPrototypeOf(first).$http, first.$http)
  assert.equal(Object.hasOwn(first, '$http'), false)
  assert.notEqual(first, first.$http)
  assert.notEqual(first.$http, second.$http)
  assert.equal('get' in first, false)
  assert.equal(typeof first.$http.get, 'function')
  assert.equal(first.list, 'get')
})

test('with always derives from the original custom Resource', () => {
  class CustomResource extends Resource {}
  const service = CustomResource.createService({ adapter: async () => ({ data: true }) })
  const derived = service.with({ basePath: 'v1' }).with({ baseUrl: '/api' })

  assert.equal(Object.getPrototypeOf(service.http.constructor.prototype), CustomResource.prototype)
  assert.equal(Object.getPrototypeOf(derived.http.constructor.prototype), CustomResource.prototype)
})

test('$http remains isolated when business methods override request methods', async () => {
  const requests = []
  const userApi = createService({
    adapter: async (config) => {
      requests.push(config)
      return { data: config.url }
    },
  }).createApi('user', {
    request(id) {
      return this.$http.get(`/${id}`, undefined, { silent: true })
    },
    post(data) {
      return this.$http.post('/save', data, { silent: true })
    },
  })

  assert.equal(await userApi.request('42'), 'user/42')
  assert.equal(await userApi.post({ name: 'Joe' }), 'user/save')
  assert.equal(await userApi.$http.get('/list', undefined, { silent: true }), 'user/list')
  assert.deepEqual(
    requests.map(({ method }) => method),
    ['GET', 'POST', 'GET']
  )
})

test('$http.setMessage replaces backend successes for the current batch', async () => {
  const completed = []
  setRequestHooks({ complete: (result) => completed.push(result) })
  const api = createService({
    adapter: async () => ({ data: { success: true, code: 0, message: '后端成功', data: true } }),
  }).createApi('user', {
    save() {
      return this.$http.post('save', {}).then((result) => {
        this.$http.setMessage('手动成功')
        return result
      })
    },
  })

  assert.equal(await api.save(), true)
  await delay(5)
  assert.deepEqual(completed[0].errors, [])
  assert.deepEqual(completed[0].successes.map(({ message }) => message), ['手动成功'])
})

test('interceptError runs immediately and messages keep reverse arrival order', async () => {
  const resolvers = new Map()
  const events = []
  setRequestHooks({
    interceptError(error) {
      events.push(`intercept:${error.message}`)
    },
    complete(result) {
      events.push(`complete:${result.errors.map(({ message }) => message).join(',')}`)
    },
  })
  const http = new Http({
    adapter: ({ url }) => new Promise((resolve, reject) => resolvers.set(url, { resolve, reject })),
  })

  const first = http.get('first')
  const second = http.get('second')
  await delay(0)
  resolvers.get('first').reject({ code: 500, message: 'first' })
  await assert.rejects(first)
  assert.deepEqual(events, ['intercept:first'])

  resolvers.get('second').reject({ code: 500, message: 'second' })
  await assert.rejects(second)
  await delay(5)
  assert.deepEqual(events, ['intercept:first', 'intercept:second', 'complete:second,first'])
})

test('silent skips loading and feedback but still intercepts errors', async () => {
  let showCount = 0
  let interceptCount = 0
  const completed = []
  setRequestHooks({
    showLoading() {
      showCount++
    },
    interceptError() {
      interceptCount++
    },
    complete(result) {
      completed.push(result)
    },
  })
  const http = new Http({
    adapter: async ({ url }) => {
      if (url === 'silent') throw { code: 500, message: '静默错误' }
      return { data: true }
    },
  })

  await assert.rejects(http.get('silent', undefined, { silent: true }))
  await delay(5)

  assert.equal(showCount, 0)
  assert.equal(interceptCount, 1)
  assert.deepEqual(completed, [])
})

test('interceptError abortAll cancels all services without collecting cancellation errors', async () => {
  const pendingAdapter = ({ signal }) =>
    new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason), { once: true })
    })
  const completed = []
  setRequestHooks({
    interceptError(error, { abortAll }) {
      if (error.code === '1401') abortAll()
    },
    complete(result) {
      completed.push(result)
    },
  })

  const firstService = createService({ adapter: pendingAdapter })
  const secondService = createService({ adapter: pendingAdapter })
  const directHttp = new Http({ adapter: pendingAdapter })
  const first = firstService.http.get('first')
  const second = secondService.http.get('second')
  const direct = directHttp.get('direct', undefined, { silent: true })
  const auth = new Http({
    adapter: async () => {
      throw { code: '1401', message: '登录失效' }
    },
  }).get('auth')

  await assert.rejects(auth)
  await Promise.allSettled([first, second, direct])
  await delay(5)

  assert.equal(completed.length, 1)
  assert.deepEqual(completed[0].errors.map(({ message }) => message), ['登录失效'])
})

test('external AbortSignal cancellation is not intercepted or collected', async () => {
  let interceptCount = 0
  const completed = []
  setRequestHooks({
    interceptError() {
      interceptCount++
    },
    complete(result) {
      completed.push(result)
    },
  })
  const http = new Http({
    adapter: ({ signal }) =>
      new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), { once: true })
      }),
  })
  const controller = new AbortController()
  const request = http.get('pending', undefined, { signal: controller.signal })

  controller.abort('用户取消')
  await assert.rejects(request, (reason) => reason === '用户取消')
  await delay(5)

  assert.equal(interceptCount, 0)
  assert.deepEqual(completed[0], { errors: [], successes: [] })
})

test('loading is delayed and complete is called once per batch', async () => {
  let showCount = 0
  let completeCount = 0
  let resolveRequest
  setRequestHooks({
    showLoading() {
      showCount++
    },
    complete() {
      completeCount++
    },
  })
  const http = new Http({
    adapter: () => new Promise((resolve) => (resolveRequest = resolve)),
  })

  const request = http.get('slow')
  await delay(220)
  assert.equal(showCount, 1)
  resolveRequest({ data: true })
  await request
  await delay(5)
  assert.equal(completeCount, 1)
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
  const resource = Resource.createService({
    adapter: async () => ({
      data: 'blob',
      headers: { 'content-disposition': headers.shift() },
    }),
  }).createApi('files', {})

  headers.push('attachment; filename="100%.csv"')
  assert.equal((await resource.$http.downloadFile('report', { silent: true })).filename, '100%.csv')

  headers.push("attachment; filename*=UTF-8''%E6%8A%A5%E5%91%8A.csv")
  assert.equal((await resource.$http.downloadFile('report', { silent: true })).filename, '报告.csv')

  headers.push("attachment; filename*=UTF-8''report%3Bfinal.csv")
  assert.equal((await resource.$http.downloadFile('report', { silent: true })).filename, 'report;final.csv')
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
