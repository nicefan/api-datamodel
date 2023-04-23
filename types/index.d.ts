/*
 * @Description:
 * @Autor: 范阳峰
 * @Date: 2020-07-06 17:17:59
 * @LastEditors: 范阳峰
 * @LastEditTime: 2021-08-20 09:55:46
 */
type HttpMethod = 'GET' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'POST' | 'PUT'

type HttpResponseType = 'blob' | 'json' | 'text' 

type Obj<T = any> = Record<string, T>
type Cls<T = any> = new (...args: any[]) => T
type Fn<T = any> = (...args: any) => T
type ErrorMessageMode =  'none'| 'message' |'modal'
interface MessageData {
  success?: boolean
  code?: number | string
  message?: string
  /** 消息类型 */
  type?: 'success' | 'warning' | 'info' | 'error'
  errMessageMode?: ErrorMessageMode
}

interface RequestConfig {
  /** 用于请求的服务器 URL */
  // url?: string
  /** 创建请求时使用的方法, 默认"GET" */
  method?: HttpMethod
  baseURL?: string
  // transformRequest?: AxiosTransformer | AxiosTransformer[];
  // transformResponse?: AxiosTransformer | AxiosTransformer[];
  /** 被发送的自定义请求头 */
  headers?: any
  /** 与请求一起发送的 URL 参数 */
  params?: Record<string, unknown>
  /** URL参数序列化的函数 */
  // paramsSerializer?: (params: any) => string;
  data?: any
  timeout?: number
  /** 跨域请求时是否需要使用凭证 */
  withCredentials?: boolean
  /** 服务器响应的数据类型，默认"json" */
  responseType?: HttpResponseType
  onUploadProgress?: (progressEvent: any) => void
  onDownloadProgress?: (progressEvent: any) => void
  // maxContentLength?: number;
  /** 后台加载，不显示loading等待框 */
  backendLoad?: boolean
  /** 静默请求，不显示loading及消息 */
  silent?: boolean
  /** 错误提示方式 */
  errMessageMode?: ErrorMessageMode
  /** 指定下载时保存的文件名 */
  filename?: string
}

/** uni-app 上传文件的请求参数 */
interface UniFormData {
  /** 要上传文件资源的路径。 */
  filePath: string
  /** 文件对应的参数名 */
  fileKey: string
  [key: string]: any
}
/** 分页接口数据类型 */
interface PagesResult {
  /** 当前页 */
  current: number
  /** 总页数 */
  pageCount: number
  /** 分页大小 */
  pageSize: number
  /** 总记录数 */
  total: number
  /** 数据记录 */
  records: Obj[]
}
