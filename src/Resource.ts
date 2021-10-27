import Http from './Http'
import factory, { create } from './utils/ResFactory'
import { getDefRequestConfig} from './service'
import merge from 'lodash/merge'
import { pagesExtend } from './BaseList'
import {infoExtend} from './BaseInfo'
class Resource extends Http {
  /** 工厂模式快速创建实例 */
  static create = create
  static factory = factory
  static ERROR = new TypeError('Api instance undefined!')
  static rootPath =''
  /**通过继承生成自定类时，可以指定该属性实现多服务器请求 */
  protected basePath = ''

  constructor(config: string | RequestConfig = '') {
    super()
    let _baseUrl = ''
    if (typeof config === 'string') {
      _baseUrl = config
    }
    else {
      const {baseURL = '', ..._config} = config
      _baseUrl = baseURL
      this.setDefault(config)
    }
    this.basePath = _baseUrl
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

  request(config: RequestConfig) {
    const url = (this.constructor as any).rootPath + '/' + this.basePath + '/'
    const _config = merge({}, getDefRequestConfig(), config, {
      baseURL: url.replace(/\/+/g, '/'),
    })
    return super.request(_config)
  }

  /** 查询分页列表 */
  getPageList(param?: Obj): Promise<PagesResult> {
    return super.post('page', param)
  }

  /** formData表单格式上传文件 */
  upload(apiName: string, data: FormData | UniFormData, config?: RequestConfig) {
    return super.post(apiName, data, {
      headers: { 'content-type': 'multipart/form-data' },
      ...config,
    })
  }

  /** 二进制流文件下载。
   * * 默认取请求头中的filename为文件名，可配置config.filename指定下载文件名(跨平台不支持，需自行在拦截器中配置)
   **/
  downloadFile(apiName: string, config?: RequestConfig) {
    return this.request({
      responseType: 'blob',
      url: apiName,
      method: 'POST',
      ...config,
    })
  }

  /** 创建一个数据实体类 */
  makeInfoClass<T, R extends Resource>(this:R, Def: Cls<T>) {
    return infoExtend(Def, this)
  }

  /** 创建一个分页列表类 */
  makePagesClass<T, Qu = Obj>(Info?: Cls<T>, methodName = 'page') {
    const queryMethod = (param: Obj) => this.post(methodName, param) as Promise<PagesResult>
    return pagesExtend<Qu, T>(queryMethod, Info)
  }

  /** 快速创建一个无类型分页数据列表实例 */
  createPagesInstance<Param = Obj, T = Obj>(defParam?: Obj, method = this.getPageList, Item?: Cls<T>) {
    return new (pagesExtend(method.bind(this), Item))<Param>(defParam)
  }
}

export const createApi = Resource.factory()
export default Resource
