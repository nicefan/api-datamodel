import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse as parseYaml } from 'yaml'

function formatPreview(content) {
  // 错误响应可能是完整 HTML，只保留足够定位问题的片段，避免终端被大量无关内容淹没。
  const preview = content.replace(/\s+/g, ' ').trim()
  if (!preview) return '响应内容为空'
  return preview.length > 200 ? `${preview.slice(0, 200)}…` : preview
}

function parseDocument(content, source, format) {
  let document
  try {
    document = format === 'yaml' ? parseYaml(content) : JSON.parse(content)
  } catch (error) {
    const type = format === 'yaml' ? 'YAML' : 'JSON'
    throw new Error(`Swagger 文档不是有效的 ${type}：${formatPreview(content)}（来源：${source}）`, { cause: error })
  }
  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    throw new Error(`Swagger 文档必须是对象（${source}）：${formatPreview(content)}`)
  }
  if (!document.openapi && !document.swagger) {
    const message = document.message ?? document.msg ?? document.error
    const code = document.code === undefined ? '' : `（错误码：${document.code}）`
    const detail = message ? `，接口返回业务错误${code}：${message}` : `：${formatPreview(content)}`
    throw new Error(`响应内容不是有效的 Swagger/OpenAPI 文档，缺少 openapi 或 swagger 版本字段${detail}`)
  }
  return document
}

function sourceFormat(source, contentType = '') {
  return /ya?ml/i.test(contentType) || /\.ya?ml(?:$|[?#])/i.test(source) ? 'yaml' : 'json'
}

async function loadRemoteDocument(source, request = {}) {
  const timeout = request.timeout ?? 30000
  let response
  try {
    response = await fetch(encodeURI(source), {
      headers: { accept: 'application/json, application/yaml, text/yaml', ...request.headers },
      signal: AbortSignal.timeout(timeout),
    })
  } catch (error) {
    const detail = error.name === 'TimeoutError' ? `请求超过 ${timeout}ms` : error.cause?.code ?? error.message
    throw new Error(`无法访问 Swagger 文档地址 ${source}：${detail}`, { cause: error })
  }
  let content
  try {
    content = await response.text()
  } catch (error) {
    throw new Error(`读取 Swagger 文档响应失败（HTTP ${response.status}）：${error.message}`, { cause: error })
  }
  if (!response.ok) {
    const status = [response.status, response.statusText].filter(Boolean).join(' ')
    throw new Error(`Swagger 文档请求失败（HTTP ${status}）：${formatPreview(content)}`)
  }
  return parseDocument(content, source, sourceFormat(source, response.headers.get('content-type') ?? ''))
}

async function loadLocalDocument(cwd, source) {
  const filePath = source.startsWith('file:') ? fileURLToPath(source) : path.resolve(cwd, source)
  let content
  try {
    content = await readFile(filePath, 'utf8')
  } catch (error) {
    throw new Error(`读取本地 Swagger 文档失败：${filePath}：${error.message}`, { cause: error })
  }
  return parseDocument(content, filePath, sourceFormat(filePath))
}

export function isDocumentSource(value) {
  return /^(https?:|file:)/i.test(value) || /\.(?:json|ya?ml)$/i.test(value)
}

export async function loadSwaggerDocument({ cwd, source, request }) {
  return /^https?:\/\//i.test(source) ? loadRemoteDocument(source, request) : loadLocalDocument(cwd, source)
}
