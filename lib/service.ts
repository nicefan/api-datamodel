// eslint-disable-next-line @typescript-eslint/no-var-requires
/*
 * @Description: 初始化数据请求配置
 * @Autor: 范阳峰
 * @Date: 2020-07-09 14:53:53
 * @LastEditors: 范阳峰
 * @LastEditTime: 2021-08-17 23:27:03
 */

import merge from 'lodash/merge'

interface Adapter {
  request: (config: RequestConfig) => Promise<unknown>
  [key: string]: any
}

let _adapter: Adapter
  /** 设置请求处理对象 */
export function setAdapter(adapter: Adapter): void {
  _adapter = adapter
}
export function getAdapter() {
  return _adapter
}

const config = {
  /** 服务地址,在web端或h5的开发环境下，走默认的/api前缀代理 */
  apiServer: '/api',
  /** 是否在uniapp环境 */
  isUniapp: false,
  /** 门户默认请求前缀 */
  basePath: 'entrance' as const,
}

export function setApiConfig(cfg: Partial<typeof config>) {
  Object.assign(config, cfg)
}
export function getApiConfig() {
  return config
}


declare const uni: Obj

// interface AccessHeader {
//   'access-app': string
//   'TENANT-CODE': string
//   'Authorization': string
// }
// let accessHeader: undefined | AccessHeader
// function getHeader() {
//   if (!accessHeader) {
//     const header = config.isUniapp ? uni.getStorageSync('accessHeader') : localStorage.accessHeader
//     accessHeader = (header && JSON.parse(header)) || {}
//   }
//   return accessHeader
// }
// function setHeader(_accessHeader?: AccessHeader) {
//   accessHeader = _accessHeader
//   if (_accessHeader) {
//     const header = JSON.stringify(_accessHeader)
//     config.isUniapp ? uni.setStorageSync('accessHeader', header) : localStorage.setItem('accessHeader', header)
//   } else {
//     config.isUniapp ? uni.clearStorageSync() : localStorage.clear()
//   }
// }

const _defRequestConfig: RequestConfig = {}
/** 默认请求参数配置 */
export function setDefRequestConfig({ headers, params, responseType, timeout, withCredentials, loading }: RequestConfig) {
  merge(_defRequestConfig, {
    headers,
    params,
    responseType,
    timeout,
    withCredentials,
    loading,
  })
}
export function getDefRequestConfig() {
  return _defRequestConfig
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
  /** APP api服务器配置 */
  apiConfig?: { channel: string; apiServer?: string; isUniapp: boolean }
  /** 默认请求配置 */
  defRequestConfig?: Omit<RequestConfig, 'url' | 'baseURL' | 'method'>
  /** loading 组件服务 */
  loadingServe?: LoadingServe
}
export function init({ apiConfig, loadingServe, defRequestConfig }: InitConfig = {}) {
  if (apiConfig) {
    setApiConfig(apiConfig)
  }
  if (loadingServe) {
    setLoadingServe(loadingServe)
  }
  if (defRequestConfig) {
    setDefRequestConfig(defRequestConfig)
  }
}

export default {
  // init,
  setApiConfig,
  getApiConfig,
  // getHeader,
  // setHeader,
  setLoadingServe,
  getLoadingServe,
  setDefRequestConfig,
  getDefRequestConfig,
}
