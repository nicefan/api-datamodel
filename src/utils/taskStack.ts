import {getLoadingServe} from '../service'

let state: 'ready' | 'pending' | 'loading' = 'ready'
/** pending请求次数 */
let pendNum = 0
/** 关闭loading计时器 */
let timeout:NodeJS.Timeout 
/** 显示loading计时器 */
let showTimeout:NodeJS.Timeout
let msgData: MessageData | undefined

const LoadingServe = getLoadingServe
/**
 * 开始一个请求加入列队
 * @param {boolean} immed 不做延时，立即显示
 */
function start(immed = false) {
  if (state === 'ready') {
    pendNum = 1
    state = 'pending'
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

function complete(data?: any) {
  if (data?.message) msgData = data
  pendNum--
  if (state === 'ready') {
    // 没有启动loading时也可以显示消息
    showMessage()
  } else if (pendNum <= 0) {
    if (state === 'pending') {
      // 没有并发请求时立即取消loading
      clearTimeout(showTimeout)
      showMessage()
    } else if (state === 'loading') {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        showMessage()
      }, 100)
    }
  }
}
/** 加载完成显示的消息 */
function showMessage(data = msgData) {
  LoadingServe().close(data)
  msgData = undefined
  state = 'ready'
  clearTimeout(showTimeout)
  clearTimeout(timeout)
}

export default {
  start,
  complete,
  showMessage,
}
