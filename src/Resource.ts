import Http from './Http'
import factory, { create } from './utils/ResFactory'
import { getDefRequestConfig, getApiConfig } from './service'
import merge from 'lodash/merge'
import { pagesExtend } from './BaseList'
import {infoExtend} from './BaseInfo'
class Resource extends Http {
  /** 工厂模式快速创建实例 */
  static create = create
  static factory = factory
  static ERROR = new TypeError('Api instance undefined!')
  /** 业务请求前缀，默认使用全局配置 */
  static rootPath = ''
  /**通过继承生成自定类时，可以指定该属性实现多服务器请求 */
  private static config = {}
  /** 动态配置当前业务请求配置信息 */
  static setDefaultConfig(config?: RequestConfig) {
    merge(this.config, config)
  }

  protected basePath = ''
  
  constructor(name: string = '', config?: RequestConfig) {
    super(config)
    const _rootPath = new.target.rootPath || getApiConfig().rootPath
    this.basePath = name.startsWith('/') ? name : `${_rootPath}/${name}`
    this.basePath += this.basePath.endsWith('/') ? '' : '/'
  }

  /** 定义业务请求数据处理逻辑 */
  protected interceptorResolve(response) {
    const { code, msg: message, data } = response.data
    if (code === 0) {
      this.setMessage({ code, message })
      return data
    } else {
      return Promise.reject({ ...response, code, message, setMessage: this.setMessage })
    }
  }
  request<T = any>(url:string, config: RequestConfig) {
    // 全局配置-> 业务配置 -> 实例配置 -> 请求配置 
    const _config = merge({}, getDefRequestConfig(), (this.constructor as typeof Resource).config, this.defaultConfig, config)
    const basePath = this.basePath.startsWith('http') ? this.basePath : getApiConfig().server + this.basePath
    return super.request<T>(basePath + url, _config)
  }

  /** 查询分页列表 */
  // getPageList(param?: Obj) {
  //   return super.post<PagesResult>('page', param)
  // }

  /** formData表单格式上传文件 */
  upload(apiName: string, data: FormData | UniFormData, config?: RequestConfig) {
    return this.request(apiName, {
      headers: { 'content-type': 'multipart/form-data' },
      data,
      method: 'POST',
      ...config,
    })
  }

  /** 二进制流文件下载。
   * * 默认取请求头中的filename为文件名，可配置config.filename指定下载文件名(跨平台不支持，需自行在拦截器中配置)
   **/
  downloadFile(apiName: string, config?: RequestConfig) {
    return this.request(apiName,{
      responseType: 'blob',
      method: 'POST',
      ...config,
    })
  }

  /** 创建一个数据实体类 */
  // makeInfoClass<T, R extends Resource>(this:R, Def: Cls<T>) {
  //   return infoExtend(Def, this)
  // }

  /** 创建一个分页列表类 */
  makePagesClass<T, Qu = Obj>(Info?: Cls<T>, methodName = 'page') {
    const queryMethod = (param: Obj) => this.post(methodName, param) as Promise<PagesResult>
    return pagesExtend<Qu, T>(queryMethod, Info)
  }

  /** 快速创建一个无类型分页数据列表实例 */
  createPagesInstance<Param = Obj, T = Obj>(defParam?: Obj, method?: Fn, Item?: Cls<T>) {
    const queryMethod = method || this['getPageList'] || ((param: Obj) => this.post('page', param))
    return new (pagesExtend(queryMethod.bind(this), Item))<Param>(defParam)
  }
}

export const createApi = Resource.factory()
export default Resource
