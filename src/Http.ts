import MessageHandle from './utils/messageHandle'
import merge from 'lodash/merge'

let _adapter: Adapter

class Http {
  /** 设置请求处理对象 */
  static setAdapter(adapter: Adapter): void {
    _adapter = adapter
  }
  protected defaultConfig: RequestConfig = {}

  /** 请求数据拦截，在子类实现 */
  protected interceptorResolve(data: any) {
    return data
  }

  /** 请求返回后可用于处理消息提示 */
  setMessage!: MessageHandle['setMessage']

  constructor(config?: RequestConfig) {
    config && this.setDefault(config)
  }

  protected setDefault(config: RequestConfig) {
    merge(this.defaultConfig, config)
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

  request<R = any>(url: string, { loading,  ..._config }: RequestConfig = {}) {
    if (!_adapter) {
      throw new Error('request对象暂未定义，请先初始化！')
    }
    const showLoading = loading !== false
    const msgHandle = new MessageHandle(showLoading)
    this.setMessage = msgHandle.setMessage.bind(msgHandle)
    const config = merge({}, this.defaultConfig, _config)
    const request = _adapter(url, config).then((response) => {
      msgHandle.setup(response)

      const { responseType, filename } = config
      const data = response.data
      if (responseType === 'blob') {
        // axios blob数据转为url,保持和uniRequest一致
        if (data.size) {
          return window.URL.createObjectURL(data)
        }
        return data
      } 
      return this.interceptorResolve(response)
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
