import merge from 'lodash/merge'
import Resource from './Resource'

export const defaultOptions: Partial<DefOptions> = {
  // defRequestConfig: {
  //   timeout: 50000
  // },
  // transformResponse(resultData) {
  //   const { code, message, data } = resultData
  //   return {
  //     code,
  //     message: message === 'SUCCESS' ? '' : message,
  //     data,
  //     success: code === 0 || code === 200
  //   }
  // }
}

/** loading服务 */
interface LoadingServe {
  show(): void
  /** 结束loading,并处理状态消息 */
  close(data?: MessageData): void
}
let _loadingServe: LoadingServe
/** loading服务配置 */
export function setLoadingServe(loadingServe: LoadingServe) {
  _loadingServe = loadingServe
}
export function getLoadingServe() {
  if (!_loadingServe) throw new Error('请先执行平台初始化！')
  return _loadingServe
}

/** 初始化请求服务配置 */
type InitConfig = {
  /** 请求适配器，包含有request方法的对象，如：axios */
  adapter: Adapter
  /** 是否为跨平台框架,如：Taro,Uni */
  // isCorssFrame?:boolean,
  /** 不同环境的服务器地址或代理前缀 */
  /** loading 组件服务 */
  loadingServe?: LoadingServe
} & DefOptions

/**
 * 设置全局配置
 * @param config -{ adapter, defRequestConfig, loadingServe }
 * @param config.adapter 请求模块 如：axios
 */
export function setGlobalConfig({ loadingServe, ...options }: InitConfig) {
  if (loadingServe) {
    setLoadingServe(loadingServe)
  }

  merge(defaultOptions, options)
}

export function defineConfig(options: DefOptions) {
  return options
}

/** 配置全局请求参数，并返回一个服务工厂方法 */
export function serviceInit(config) {
  setGlobalConfig(config)

  return Resource.factory()
}

/** 创建一个请求服务 */
// export function createServer(config: DefOptions) {
//   class Server extends Resource{
//     protected static options = config
//   }
//   return Server
// }
