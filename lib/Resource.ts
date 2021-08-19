// import qs from 'qs'
import Http from './Http'
import ResFactory, { create } from './utils/ResFactory'
import service from './service'
import merge from 'lodash/merge'
import { pagesFactory } from './BaseList'
import {infoFactory} from './BaseInfo'

const _defRequestConfig = {
  timeout: 50000,
  headers: {
    'content-type': 'application/json',
  },
}

class Resource extends Http {
  /** 工厂模式快速创建实例 */
  static create = create
  constructor(protected baseUrl = '') {
    super(_defRequestConfig)
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
    const _config = merge({}, service.getDefRequestConfig(), config, {
      baseURL: service.getApiConfig().apiServer + '/' + this.baseUrl,
      // headers: service.getHeader(),
    })
    return super.request(_config)
  }

  // get(apiName: string, param?: Obj, config?: RequestConfig) {
  //   const hash = Math.random().toString(36).substr(-3)
  //   // params = { ...params, h: new Date().getTime().toString(36) } // 加个hash解决ie缓存问题。
  //   return super.get(apiName + '?' + hash, param, config)
  // }

  // post(apiName: string, data: Obj = {}, config?: RequestConfig) {
  //   return super.post(apiName, data, config)
  // }

  /** 使用表单格式提交 */
  // formPost(apiName: string, param?: Record<string, unknown>, config?: RequestConfig) {
  //   return this.post(apiName, qs.stringify(param), config)
  // }
  /** 查询列表 */
  // getList(param?: Obj) {
  //   return super.post('list', param)
  // }

  /** 查询分页列表 */
  getPageList(param?: Obj): Promise<PagesResult> {
    return super.post('page', param)
  }

  /** 针对单个记录状态切换 */
  // set(apiName: string, id: string) {
  //   return this.post(apiName, { id })
  // }

  /** 获取id详情 */
  // getInfo(id: string) {
  //   return super.get(id)
  // }

  /** id删除 */
  // delete(id: string, param?: Obj) {
  //   return super.delete(id, param)
  // }

  /** 批量删除 */
  // deletes(ids: string[]) {
  //   return super.post('delete', { ids })
  // }

  /** 保存记录，id为空则为新增，反之修改 */
  // save(item: Obj) {
  //   const method = item.id ? 'put' : 'post'
  //   return this[method]('', item)
  // }

  /** 导出文件，可指定文件名 */
  // export(param: Obj, filename?: string) {
  //   return this.getFile('export', param, { filename })
  // }

  /** 文件导入 */
  // import(formData: FormData, param: Record<string, string> = {}) {
  //   for (const key in param) {
  //     formData.set(key, param[key])
  //   }
  //   return this.upload('import', formData)
  // }

  /** formData表单格式上传文件 */
  upload(apiName: string, data: FormData | UniFormData, config?: RequestConfig) {
    return super.post(apiName, data, {
      headers: { 'content-type': 'multipart/form-data' },
      ...config,
    })
  }

  /** 二进制流文件下载。
   * * 默认取请求头中的filename为文件名，可配置config.filename指定下载文件名
   **/
  downloadFile(apiName: string, param?: any, config?: RequestConfig) {
    return super.post(apiName, param, {
      responseType: 'blob',
      ...config,
    })
  }

  getFile(apiName: string, param?: Obj, filename?: string) {
    return super.get(apiName, param, {
      responseType: 'blob',
      filename,
      // loading: false,
    })
  }

  /** 创建一个数据实体类 */
  makeInfoClass<T, R extends Resource>(this:R, Def: Cls<T>) {
    return infoFactory(Def, this)
  }

  /** 创建一个分页列表类 */
  makePagesClass<T, Qu = Obj>(Info?: Cls<T>, methodName = 'page') {
    const queryMethod = (param: Obj) => this.post(methodName, param) as Promise<PagesResult>
    return pagesFactory<Qu, T>(queryMethod, Info)
  }

  /** 快速创建一个无类型分页数据列表实例 */
  createPagesInstance<Param = Obj, T = Obj>(defParam?: Obj, method = this.getPageList, Item?: Cls<T>) {
    return new (pagesFactory<Param, T>(method.bind(this), Item))(defParam)
  }

  // createPageList<Query = Obj, Info = Obj>(methodName?: PName<this>) {
  //   const method: any = methodName && typeof this[methodName] === 'function' ? this[methodName] : this.getPageList.bind(this)
  //   return pagesFactory<Query, Info>(method.bind(this))
  // }
}

export const createRes = ResFactory(Resource)
export default Resource
