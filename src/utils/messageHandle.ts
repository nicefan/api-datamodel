import taskStack from './taskStack'
import isPlainObject from 'lodash/isPlainObject'

interface HandleOptions {
    /** 后台加载，不显示loading等待框 */
    backendLoad?: boolean
    /** 静默请求，不显示loading及消息 */
    silent?: boolean
    /** 错误提示方式 */
    errMessageMode?: ErrorMessageMode  
}
export default class Handle {
  /** 手动设置消息数据 */
  private _md?: MessageData
  private _orginData?: any

  constructor(private _options: HandleOptions = {}) {
    const {backendLoad, silent} = _options
   if (!backendLoad && !silent) taskStack.start()
  }

  private isInit = false

  setup(errData?: any) {
    if (this._options.silent) return
    if (errData) {
      const { code, message } = errData
      const _message = this.formatError(code, message)
      this._orginData = {...errData, type: 'error', message: _message, errMessageMode: this._options.errMessageMode}
    }
  
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
      this._md = undefined
    } else if (typeof msgData === 'string') {
      this._md = { ...this._md, message: msgData }
    } else {
      this._md = { ...this._md, ...msgData }
    }
  }

  private handle() {
    let msgData
    if (this._orginData || this._md) {
      msgData = { type: 'success', ...this._orginData, ...this._md }
    }

    if (!this._options.backendLoad) {
      taskStack.complete(msgData)
    } else if (msgData) {
      // 不进行loading加载的请求消息显示
      taskStack.showMessage(msgData)
    }
  }

  // 请求异常处理
  private formatError(code?: string | number, _message='') {
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
