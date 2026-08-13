import { defaultOptions } from './service'
import factory, { create } from './utils/ResFactory'
import MessageHandle from './utils/messageHandle'
import merge from 'lodash/merge'

class Http {
  /** 工厂模式快速创建实例 */
  static create = create
  static factory = factory
  static ERROR = new TypeError('Api instance undefined!')
  protected static options: Partial<DefOptions> = {}

  /** 请求返回后可用于处理消息提示 */
  setMessage!: MessageHandle['setMessage']

  protected requestConfig: RequestConfig = {}
  private abortControllers = new Set<AbortController>()

  private basePath = ''
  private options
  constructor(arg1?: string | DefOptions, arg2?: DefOptions) {
    const path = typeof arg1 === 'string' ? arg1 : ''
    const config = typeof arg1 === 'object' ? arg1 : arg2
    this.options = { ...defaultOptions, ...new.target.options, ...config }

    // config && this.setDefault(config)
    const { serverUrl = '', rootPath = '' } = this.options
    this.basePath = serverUrl + (!path ? rootPath : path.startsWith('/') ? path : `${rootPath}/${path}`)
  }

  protected setDefault(config: RequestConfig) {
    merge(this.requestConfig, config)
  }

  /** 请求数据消息处理 */
  protected interceptorResolve(response) {
    const { code, message, data, success } = response.data || {}
    if (success === undefined && code === undefined) {
      return response.data
    } else if (success === false) {
      return Promise.reject({
        ...response,
        code,
        message,
        setMessage: this.setMessage,
      })
    } else {
      this.setMessage({ code, message })
      return data
    }
  }

  post<T = any>(url: string, data?: Obj, config: RequestConfig = {}) {
    return this.request<T>(url, {
      ...config,
      data,
      method: 'POST',
    })
  }

  get<T = any>(url: string, data?: Obj, config: RequestConfig = {}) {
    return this.request<T>(url, {
      ...config,
      method: 'GET',
      params: data,
    })
  }

  put<T = any>(url: string, data?: Obj, config: RequestConfig = {}) {
    return this.request<T>(url, {
      ...config,
      data,
      method: 'PUT',
    })
  }

  delete<T = any>(url: string, data?: Obj, config: RequestConfig = {}) {
    return this.request<T>(url, {
      ...config,
      params: data,
      method: 'DELETE',
    })
  }

  /** 中止当前资源所有进行中的请求 */
  abort(reason?: any) {
    this.abortControllers.forEach((controller) => controller.abort(reason))
    this.abortControllers.clear()
  }

  request<R = any>(path: string, config: RequestConfig = {}) {
    const { adapter, defRequestConfig, requestInterceptors, transformResponse } = this.options
    if (!adapter) {
      throw new Error('request对象暂未定义，请先初始化！')
    }
    // 全局配置-> 业务配置 -> 实例配置 -> 请求配置
    const { backendLoad, silent, messageMode, IgnoreInterceptor, ..._config } = merge(
      {},
      defRequestConfig,
      this.requestConfig,
      config
    )
    const controller = new AbortController()
    const signal = _config.signal
    const abort = () => controller.abort(signal?.reason)
    if (signal?.aborted) {
      abort()
    } else {
      signal?.addEventListener('abort', abort, { once: true })
    }
    _config.signal = controller.signal
    this.abortControllers.add(controller)
    const url = this.basePath + (path && !path.startsWith('/') ? '/' : '') + path

    const msgHandle = new MessageHandle({ backendLoad, silent, messageMode })
    this.setMessage = msgHandle.setMessage.bind(msgHandle)
    // 请求前的请求拦截操作
    let requestConfig = { url, ..._config }
    requestConfig = requestInterceptors?.(requestConfig) || requestConfig

    const request = adapter(requestConfig)
      .then((response) => {
        msgHandle.setup()

        if (
          IgnoreInterceptor ||
          (IgnoreInterceptor !== false && requestConfig.responseType && requestConfig.responseType !== 'json')
        ) {
          return response
        }
        const data = response.data
        // 返回数据格式化处理
        if (transformResponse) {
          response.data = transformResponse(data)
        }
        return this.interceptorResolve(response)
      })
      .finally(() => {
        signal?.removeEventListener('abort', abort)
        this.abortControllers.delete(controller)
      })

    Promise.resolve(request)
      .catch((err) => {
        const code = err?.code || err?.status || -1
        msgHandle.setup({ ...err, code })
      })
      .then(() => {})

    return request as Promise<R>
  }
}

/** 通用实例，新实例使用create方法 */
export default Http
