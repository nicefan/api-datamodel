interface Adapter {
  (url: string, config: RequestConfig): Promise<any>
  [key: string]: any
}
type DefaultRequestConfig = Partial<
  Pick<RequestConfig, 'headers' | 'timeout' | 'withCredentials' | 'backendLoad'>
>
interface DefOptions {
  /** 请求适配器，包含有request方法的对象，如：axios */
  adapter: Adapter
  /** 不同环境的服务器地址或代理前缀 */
  serverUrl?: string
  /** 业务请求前缀 */
  rootPath?: string
  /** 默认请求配置 */
  defRequestConfig?: DefaultRequestConfig
  /** 请求前拦截处理 */
  requestInterceptors?: (config: RequestConfig) => RequestConfig
  /** 定义业务请求数据处理逻辑 */
  transformResponse?: (result: Obj) => {
    code: number
    message: string
    data: Obj
    success: boolean
  }
}
