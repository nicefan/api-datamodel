/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-use-before-define */
import MessageHandle from './utils/messageHandle'
import merge from 'lodash/merge'
import { getAdapter } from './service'


class Http {
  /** 请求处理对象 */
  #Adapter = getAdapter()
  protected defaultConfig: RequestConfig = {}

  /** 请求数据拦截，在子类实现 */
  protected interceptorResolve(data: any) {
    return data
  }

  // protected setInterceptor(fn: Fn) {
  //   this.interceptorResolve = fn
  // }

  /** 请求返回后可用于处理消息提示 */
  setMessage!: MessageHandle['setMessage']

  constructor(config?: RequestConfig) {
    config && this.setDefault(config)
  }

  // create(config?: RequestConfig) {
  //   return new Http(config)
  // }

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
    if (!this.#Adapter) {
      throw new Error('request对象暂未定义，请先初始化！')
    }
    const showLoading = loading !== false
    const msgHandle = new MessageHandle(showLoading)
    this.setMessage = msgHandle.setMessage.bind(msgHandle)

    const config = merge({}, this.defaultConfig, _config)
    if (config.url?.startsWith('http')) config.baseURL = ''
    const request = this.#Adapter.request(config).then((response: any) => {
      msgHandle.setup(response)

      const { responseType, filename } = config
      const data = response.data
      if (responseType === 'blob') {
        // axios blob数据转为url,保持和uniRequest一致
        if (data.size) {
          return window.URL.createObjectURL(data)
        }
        // if (data instanceof Blob) {
        //   return window.URL.createObjectURL(data)
        // }
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

function saveFile(res: any, filename = '') {
  const str = res.headers?.['content-disposition'] || ''
  filename = filename || str.match(/filename=(\S*?)(;|$)/)[1]
  const downloadElement = document.createElement('a')
  const href = window.URL.createObjectURL(res.blob()) // 创建下载的链接
  downloadElement.href = href
  downloadElement.download = decodeURI(filename) // 下载后文件名
  document.body.appendChild(downloadElement)
  downloadElement.click() // 点击下载
  document.body.removeChild(downloadElement) // 下载完成移除元素
  window.URL.revokeObjectURL(href) // 释放掉blob对象
}

// export const http = new Http()

/** 通用实例，新实例使用create方法 */
export default Http
