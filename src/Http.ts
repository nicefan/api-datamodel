import MessageHandle from './utils/messageHandle'
import merge from 'lodash/merge'


interface Adapter {
  request: (config: RequestConfig) => Promise<unknown>
  [key: string]: any
}

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


  setDefault(config: RequestConfig) {
    merge(this.defaultConfig, config)
  }

  post(url: string, data?: Obj, config: RequestConfig = {}) {
    return this.request({
      ...config,
      url,
      data,
      method: 'POST',
    })
  }

  get(url: string, data?: Obj, config: RequestConfig = {}) {
    return this.request({
      ...config,
      url,
      method: 'GET',
      params: data,
    })
  }

  put(url: string, data?: Obj, config: RequestConfig = {}) {
    return this.request({
      ...config,
      url,
      data,
      method: 'PUT',
    })
  }

  delete(url: string, data?: Obj, config: RequestConfig = {}) {
    return this.request({
      ...config,
      url,
      data,
      method: 'DELETE',
    })
  }

  request({ loading, ..._config }: RequestConfig = {}) {
    if (!_adapter) {
      throw new Error('request对象暂未定义，请先初始化！')
    }
    const showLoading = loading !== false
    const msgHandle = new MessageHandle(showLoading)
    this.setMessage = msgHandle.setMessage.bind(msgHandle)

    const config = merge({}, this.defaultConfig, _config)
    if (config.url?.startsWith('http')) config.baseURL = ''
    const request = _adapter.request(config).then((response: any) => {
      msgHandle.setup(response)

      const { responseType, filename } = config
      const data = response.data
      if (responseType === 'blob') {
        // axios blob数据转为url,保持和uniRequest一致
        if (data.size) {
          return window.URL.createObjectURL(data)
        }
        return data
      } else if (this.interceptorResolve) {
        return this.interceptorResolve(response)
      }
      return response
    })

    Promise.resolve(request)
      .catch((err) => {
        const code = err?.status || err?.code || -1
        msgHandle.setup({ ...err, code })
      })
      .then((data) => {})

    return request
  }
}

/** 通用实例，新实例使用create方法 */
export default Http
