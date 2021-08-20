import taskStack from './taskStack'
import isPlainObject from 'lodash/isPlainObject'

export default class Handle {
  /** 手动设置消息数据 */
  private _md?: MessageData
  private _orginData?: any

  constructor(private showLoading = true) {
    if (showLoading) taskStack.start()
  }

  proxy(request: Promise<any>) {
    const _promise = request.then(
      (res) => this.setup(res),
      (err) => this.setup(err)
    )

    return _promise
    // 使用代理模式，通过用户在promise接收数据后，使用return返回消息
    // const interceptor = ProxyPromise(_promise)
    // interceptor.result(this.send)
    // return interceptor
  }

  private isInit = false

  setup(data: any) {
    this._orginData = data
  
    if (this.isInit) return
    this.isInit = true

    // 延后执行消息处理
    setTimeout(() => {
      this.handle()
    }, 1)
  }

  /** 替换消息，消息类型按请求状态，空字符串将取消显示后台消息 */
  setMessage(msgData: MessageData | string): void {
    if (!msgData) {
      this._md = { code: 0, message: '' }
    } else if (typeof msgData === 'string') {
      this._md = { message: msgData }
    } else {
      this._md = { ...msgData }
    }
  }

  private handle() {
    const data = {...this._orginData, ...this._md}
    let msgData

    const { code, message, type } = data as MessageData
    if (code) {
      const _message = this.formatError(code, message)
      msgData = {...data, type:'error', message: _message}
    } else if (typeof message === 'string') {
      msgData = {
        ...data,
        // 后台返回null表示无消息处理！
        message,
        type: type || 'success',
      }
    }

    if (this.showLoading) {
      taskStack.complete(msgData)
    } else if (msgData) {
      // 不进行loading加载的请求消息显示
      // taskStack.showMessage(msgData)
    }
  }

  // 请求异常处理
  private formatError(code: string | number, _message='') {
    let message = _message

    if (code === 401 || code === -2) {
      const patrn = /.*[\u4e00-\u9fa5]+.*$/
      message = patrn.test(message) ? message : '授权失败，请重新登录'
      // message = '授权失败，请重新登录'
    } else if (code === 408 || code === 'ECONNABORTED') {
      message = '连接超时'
    } else if (message === 'Network Error') {
      message = '网络连接失败'
    } else if (code === 500) {
      message = message || '内部服务器错误'
    }
    return message
  }
}
