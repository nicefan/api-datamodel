import { defaultOptions } from './service'
import MessageHandle from './utils/messageHandle'
import merge from 'lodash/merge'

class Http {
  protected static options:Partial<DefOptions> = {}

  /** 请求返回后可用于处理消息提示 */
  setMessage!: MessageHandle['setMessage']

  protected requestConfig: RequestConfig = {}

  private basePath = ''
  private options
  constructor(path:string, config?: DefOptions) {
    this.options = {...defaultOptions, ...new.target.options, ...config}

    // config && this.setDefault(config)
    const {serverUrl='', rootPath=''} = this.options
    this.basePath = serverUrl + (!path ?  rootPath : path.startsWith('/') ? path : `${rootPath}/${path}`)
  }

  protected setDefault(config: RequestConfig) {
    merge(this.requestConfig, config)
  }

  /** 请求数据消息处理 */
  protected interceptorResolve(response) {
    const {code, message, data, success} = response.data || {}
    if (code === 'undefined') {
      return response.data
    }
    else if (success) {
      this.setMessage({ code, message, success })
      return data
    } else {
      return Promise.reject({ ...response, code, message, setMessage: this.setMessage })
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
    return this.request<T>(url,{
      ...config,
      data,
      method: 'DELETE',
    })
  }

  request<R = any>(path: string, config: RequestConfig = {}) {
    const {adapter, defRequestConfig, requestInterceptors, transformResponse} = this.options
    if (!adapter) {
      throw new Error('request对象暂未定义，请先初始化！')
    }
    // 全局配置-> 业务配置 -> 实例配置 -> 请求配置 
    const {backendLoad, silent, errMessageMode, filename, ..._config} = merge({}, defRequestConfig, this.requestConfig, config)

    const msgHandle = new MessageHandle({backendLoad, silent, errMessageMode})
    this.setMessage = msgHandle.setMessage.bind(msgHandle)
    // 请求前的请求拦截操作
    const requestConfig = requestInterceptors?.(_config) || _config
    const url = this.basePath + (path && !path.startsWith('/') ? '/' : '') + path

    const request = adapter(url, requestConfig).then((response) => {
      msgHandle.setup()

      const data = response.data
      if (requestConfig.responseType === 'blob') {
        // axios blob数据转为url,保持和uniRequest一致
        if (data.size) {
          return window.URL.createObjectURL(data)
        }
        return data
      } 
      // 返回数据格式化处理
      if (transformResponse) {
        response.data = transformResponse(data)
      }
      if (Reflect.has(response.data, 'success')) {
        // 数据结果中有success属性，进行业务层消息拦截
        return this.interceptorResolve(response)
      } else {
        return response
      }
    })

    Promise.resolve(request)
      .catch((err) => {
        const code = err?.status || err?.code || -1
        msgHandle.setup({ ...err, code })
      })
      .then((data) => {})

    return request as Promise<R>
  }
}

/** 通用实例，新实例使用create方法 */
export default Http
