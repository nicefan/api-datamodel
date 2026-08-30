function appendParams(url: string, params?: Record<string, unknown>) {
  if (!params) return url

  const [urlWithoutHash, hash = ''] = url.split('#', 2)
  const query = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    const values = Array.isArray(value) ? value : [value]
    values.forEach((item) => query.append(key, String(item)))
  })

  const serialized = query.toString()
  if (!serialized) return url
  return `${urlWithoutHash}${urlWithoutHash.includes('?') ? '&' : '?'}${serialized}${hash ? `#${hash}` : ''}`
}

function buildBody(data: any, headers: Headers) {
  if (data === undefined || data === null) return undefined

  if (typeof FormData !== 'undefined' && data instanceof FormData) {
    // 浏览器需要自行生成包含 boundary 的 Content-Type。
    headers.delete('content-type')
    return data
  }

  if (
    typeof data === 'string' ||
    (typeof Blob !== 'undefined' && data instanceof Blob) ||
    data instanceof URLSearchParams ||
    data instanceof ArrayBuffer ||
    ArrayBuffer.isView(data)
  ) {
    return data as BodyInit
  }

  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }
  return JSON.stringify(data)
}

async function parseResponse(response: Response, responseType: HttpResponseType = 'json') {
  if (responseType === 'blob') return response.blob()
  if (responseType === 'text') return response.text()
  if (response.status === 204 || response.status === 205) return null

  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function normalizeHeaders(headers: Headers) {
  const result: Record<string, string> = {}
  headers.forEach((value, key) => {
    result[key] = value
  })
  return result
}

/** 将标准 Fetch API 包装为 api-datamodel 请求适配器。 */
export const fetchAdapter: RequestAdapter = async (config) => {
  const {
    url = '',
    baseURL = '',
    method = 'GET',
    params,
    data,
    headers: rawHeaders,
    responseType,
    signal,
    timeout,
    withCredentials,
  } = config
  const headers = new Headers(rawHeaders)
  const upperMethod = method.toUpperCase()
  const requestUrl = appendParams(baseURL + url, params)
  const controller = timeout && timeout > 0 ? new AbortController() : undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  const abort = () => controller?.abort(signal?.reason)

  if (controller) {
    if (signal?.aborted) abort()
    else signal?.addEventListener('abort', abort, { once: true })
    timer = setTimeout(() => controller.abort(new Error(`Request timeout after ${timeout}ms`)), timeout)
  }

  try {
    const response = await fetch(requestUrl, {
      method: upperMethod,
      headers,
      body: upperMethod === 'GET' || upperMethod === 'HEAD' ? undefined : buildBody(data, headers),
      credentials: withCredentials ? 'include' : 'same-origin',
      signal: controller?.signal || signal,
    })
    const responseData = await parseResponse(response, responseType)
    const normalizedResponse = {
      data: responseData,
      status: response.status,
      statusText: response.statusText,
      headers: normalizeHeaders(response.headers),
    }

    if (!response.ok) {
      throw Object.assign(new Error(response.statusText || `HTTP ${response.status}`), {
        code: response.status,
        status: response.status,
        response: normalizedResponse,
        data: responseData,
      })
    }

    return normalizedResponse
  } finally {
    if (timer) clearTimeout(timer)
    signal?.removeEventListener('abort', abort)
  }
}
