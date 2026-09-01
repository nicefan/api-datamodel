import requestManager from './utils/requestManager'
import { buildService, type HttpConstructor } from './service'

function joinUrl(baseUrl = '', ...paths: Array<string | undefined>) {
  const normalizedPaths = paths
    .filter((path): path is string => Boolean(path))
    .map((path) => path.replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)

  if (!normalizedPaths.length) return baseUrl || ''
  if (baseUrl === '/') return `/${normalizedPaths.join('/')}`

  const normalizedBaseUrl = baseUrl.replace(/\/+$/g, '')
  return normalizedBaseUrl
    ? `${normalizedBaseUrl}/${normalizedPaths.join('/')}`
    : normalizedPaths.join('/')
}

class Http {
  static defaultOptions: Partial<HttpOptions> = {}

  protected readonly resolvedOptions: Partial<HttpOptions>
  private readonly requestBaseUrl: string

  constructor(optionsOrModulePath?: string | HttpOptions, instanceOptions?: HttpOptions) {
    const modulePath = typeof optionsOrModulePath === 'string' ? optionsOrModulePath : ''
    const options = typeof optionsOrModulePath === 'object' ? optionsOrModulePath : instanceOptions
    this.resolvedOptions = options ? { ...new.target.defaultOptions, ...options } : new.target.defaultOptions
    const { baseUrl, basePath } = this.resolvedOptions
    this.requestBaseUrl = joinUrl(baseUrl, basePath, modulePath)
  }

  static createService<H extends Http>(this: HttpConstructor<H>, options: HttpOptions) {
    return buildService(this, options)
  }

  /** 设置当前请求批次的手动成功消息 */
  setMessage(message: MessageData | string = '') {
    requestManager.setMessage(message)
  }

  post<T = any>(requestPath: string, data?: Obj, config: RequestConfig = {}) {
    return this.request<T>(requestPath, { ...config, data, method: 'POST' })
  }

  get<T = any>(requestPath: string, data?: Obj, config: RequestConfig = {}) {
    return this.request<T>(requestPath, { ...config, method: 'GET', params: data })
  }

  put<T = any>(requestPath: string, data?: Obj, config: RequestConfig = {}) {
    return this.request<T>(requestPath, { ...config, data, method: 'PUT' })
  }

  delete<T = any>(requestPath: string, data?: Obj, config: RequestConfig = {}) {
    return this.request<T>(requestPath, { ...config, params: data, method: 'DELETE' })
  }

  request<R = any>(requestPath: string, config: RequestConfig = {}) {
    const { adapter, defRequestConfig, requestInterceptors, transformResponse } = this.resolvedOptions
    if (!adapter) throw new Error('request对象暂未定义，请先初始化！')

    const mergedConfig = { ...defRequestConfig, ...config }
    const { silent, messageMode, rawResponse, ...adapterConfig } = mergedConfig
    const externalSignal = adapterConfig.signal
    const controller = new AbortController()
    const abort = () => controller.abort(externalSignal?.reason)

    if (externalSignal?.aborted) abort()
    else externalSignal?.addEventListener('abort', abort, { once: true })

    const activeRequest = requestManager.start(controller, { silent, messageMode })
    const url = joinUrl(this.requestBaseUrl, requestPath)
    let finalRequestConfig: RequestConfig

    const request = Promise.resolve()
      .then(() => {
        if (controller.signal.aborted) return Promise.reject(controller.signal.reason)
        const initialConfig = { url, ...adapterConfig, signal: controller.signal }
        const interceptedConfig = requestInterceptors?.(initialConfig) || initialConfig
        // 全局中止必须始终控制实际交给 adapter 的信号。
        finalRequestConfig = { ...interceptedConfig, signal: controller.signal }
        return adapter(finalRequestConfig)
      })
      .then((response) => {
        if (
          rawResponse ||
          (rawResponse !== false &&
            finalRequestConfig.responseType &&
            finalRequestConfig.responseType !== 'json')
        ) {
          return response
        }

        if (transformResponse) response.data = transformResponse(response?.data)

        const { code, message, data, success } = response?.data || {}
        if (success === undefined && code === undefined) return response?.data
        if (success === false) {
          return Promise.reject({ ...response, code, message, setMessage: this.setMessage.bind(this) })
        }

        requestManager.addBackendSuccess(activeRequest, { code, message })
        return data
      })
      .catch((error) => {
        requestManager.handleError(activeRequest, error)
        return Promise.reject(error)
      })
      .finally(() => {
        externalSignal?.removeEventListener('abort', abort)
        requestManager.complete(activeRequest)
      })

    return request as Promise<R>
  }
}

export { joinUrl }
export default Http
