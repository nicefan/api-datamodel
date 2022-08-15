import merge from 'lodash/merge'
import Http from './Http'

interface ApiConfig {
  /** 服务地址,http开头，后面不要加'/' */
  server?: string
  /** 请求前缀 */
  rootPath?: string
}
const _apiConfig = {}
export function setApiConfig({server='', rootPath=''}: ApiConfig) {
  Object.assign(_apiConfig, {server, rootPath})
}
export function getApiConfig():ApiConfig {
  return _apiConfig
}

type DefaultRequestConfig = Partial<Pick<RequestConfig, 'headers' | 'timeout' | 'withCredentials' | 'loading'>>

const _defRequestConfig: RequestConfig = {
  // timeout: 50000,
  // headers: {
  //   'content-type': 'application/json',
  // },
}
/** 默认请求参数配置 */
export function setDefRequestConfig(config:DefaultRequestConfig) {
  merge(_defRequestConfig, config)
}
export function getDefRequestConfig() {
  return _defRequestConfig
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

/** 平台初始化 */
interface InitConfig {
  /** 请求适配器，包含有request方法的对象，如：axios */
  adapter: Adapter,
  /** 是否为跨平台框架,如：Taro,Uni */
  // isCorssFrame?:boolean,
  /** 服务器地址 */
  serverUrl?: string
  /** 请求地址前缀 */
  rootPath?: string
  /** 默认请求配置 */
  defRequestConfig?: DefaultRequestConfig
  /** loading 组件服务 */
  loadingServe?: LoadingServe
}
/**
 * 初始化数据服务
 * @param config -{ adapter, defRequestConfig, loadingServe }
 * @param config.adapter 请求模块 如：axios
 */
export function serviceInit({adapter, serverUrl, rootPath, loadingServe, defRequestConfig }: InitConfig) {
  Http.setAdapter(adapter)
  
  setApiConfig({
    server: serverUrl,
    rootPath
  })

  if (loadingServe) {
    setLoadingServe(loadingServe)
  }
  if (defRequestConfig) {
    setDefRequestConfig(defRequestConfig)
  }
}

