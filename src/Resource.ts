import Http from './Http'
import { pagesExtend } from './BaseList'
import { infoExtend } from './BaseInfo'
class Resource extends Http {
  /** 查询分页列表 */
  // getPageList(param?: Obj) {
  //   return super.post<PagesResult>('page', param)
  // }

  /** formData表单格式上传文件 */
  upload(
    apiName: string,
    data: FormData | UniFormData,
    config?: RequestConfig
  ) {
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
    return this.request(apiName, {
      responseType: 'blob',
      method: 'GET',
      ...config,
    }).then(({ data, headers }) => {
      const str = headers?.['content-disposition'] || ''
      const filename: string = str.match(/filename=(\S*?)(;|$)/)[1]
      // uniRequest中data直接返回ObjectURL
      return {
        filename,
        data,
      }
    })
  }

  /** 创建一个数据实体类 */
  // makeInfoClass<T, R extends Resource>(this:R, Def: Cls<T>) {
  //   return infoExtend(Def, this)
  // }

  /** 创建一个分页列表类 */
  makePagesClass<T, Qu extends Obj = Obj>(Info?: Cls<T>, methodName = 'page') {
    const queryMethod = (param: Obj) =>
      this.post(methodName, param) as Promise<PagesResult>
    return pagesExtend<Qu, T>(queryMethod, Info)
  }

  /** 快速创建一个无类型分页数据列表实例 */
  createPagesInstance<Param extends Obj = Obj, T = Obj>(
    defParam?: Obj,
    method?: Fn,
    Item?: Cls<T>
  ) {
    const queryMethod =
      method ||
      this['getPageList'] ||
      ((param: Obj) => this.post('page', param))
    return new (pagesExtend(queryMethod.bind(this), Item))<Param>(defParam)
  }
}

export default Resource
