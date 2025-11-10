import { getLoadingServe } from '../service'
export default (function () {
  let state: 'ready' | 'pending' | 'loading' = 'ready'
  /** pending请求次数 */
  let pendNum = 0
  /** 关闭loading计时器 */
  let timeout: NodeJS.Timeout
  /** 显示loading计时器 */
  let showTimeout: NodeJS.Timeout
  let msgData: MessageData | undefined
  /** 任务所有消息 */
  let msgList: MessageData[] = []
  const LoadingServe = getLoadingServe
  /**
   * 开始一个请求加入列队
   * @param {boolean} immed 不做延时，立即显示
   */
  const start = function (immed = false) {
    if (state === 'ready') {
      pendNum = 1
      state = 'pending'
      msgList = []
      // 等待200毫秒进入加载状态， 如果在这之前执行close方法，将清除此计时器
      showTimeout = setTimeout(
        () => {
          if (state !== 'pending') return
          LoadingServe().show()
          state = 'loading'
        },
        immed ? 0 : 200
      )
    } else {
      pendNum++
    }
  }

  const complete = function (data?: any, backendLoad = false ) {
    if (data)  {
      msgData = data
      msgList.push(data)
      LoadingServe().message?.(data)
    }
    if (backendLoad) {
      // 不进行loading加载的请求消息显示
      if (state === 'ready') {
        finish()
      }
      return
    }

    pendNum--
    if (state === 'ready') {
      // 没有启动loading时也可以显示消息
      finish()
    } else if (pendNum <= 0) {
      if (state === 'pending') {
        // 没有并发请求时立即取消loading
        clearTimeout(showTimeout)
        finish()
      } else if (state === 'loading') {
        clearTimeout(timeout)
        timeout = setTimeout(() => {
          finish()
        }, 100)
      }
    }
  }
  /** 加载完成显示的消息 */
  const finish = () => {
    LoadingServe().close(msgData, msgList)
    msgData = undefined
    state = 'ready'
    clearTimeout(showTimeout)
    clearTimeout(timeout)
  }

  return {
    start,
    complete,
    finish,
  }
})()
