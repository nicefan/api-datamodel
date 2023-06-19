import Resource from './Resource'

type Interceptor = (method: Fn<Promise<any>>, Params: Obj, res?: Resource) => Promise<PagesResult>
let _interceptor: undefined | Interceptor
/**
 * 分页列表类 <参数类型定义>
 */
export default class List<P extends Obj = Obj, T = any> {
  static setInterceptor(func: Interceptor) {
    _interceptor = func
  }
  /** 集合类型构造器 */
  protected get _ItemConstructor(): void | Cls<T> {
    return undefined
  }
  /** 请求方法定义 */
  protected _requestMethod(arg0?: Obj) {
    return Promise.reject('request method not found!')
  }
  /** 默认请求参数 */
  protected _defaultParam?: Obj ={}

  /** 保存用户查询参数 */
  protected _param?: Obj = {}

  private pageParam: { current?: number; size?: number } = {}

  records: T[] = []
  /** 当前页 */
  current = 1
  /** 总页数 */
  pageCount = 1
  /** 每页大小 */
  pageSize = 10
  /** 总条数 */
  total = 0
  /** 加载更多状态 */
  private _status?: 'more' | 'noMore' | 'loading'

  constructor(param?: any) {
    if (param) {
      this.setDefaultParam(param)
    }
    if (this._ItemConstructor) {
      // 初始化一个实例，保证实例中依赖的缓存数据进行初始加载
      new this._ItemConstructor()
    }
  }

  protected request() {
    this._status = 'loading'
    const param = { ...this._defaultParam, ...this._param, page: this.pageParam }
    return this._requestMethod(param).then((result) => {
      return this.update(result)
    })
  }

  get status() {
    return this._status
  }

  setDefaultParam({ size, ...param }: { size?: number } & P) {
    this._defaultParam = { ...this._defaultParam, ...param }
    if (size) this.pageParam.size = size
  }

  /** 查询请求数据 */
  query(param?: P) {
    delete this.pageParam.current
    this._param = param && { ...param }
    return this.request().catch((e) => {
      this.records = []
      this.current = 1
      this.total = 0
      this._status = 'noMore'
      return Promise.reject(e)
    })
  }

  /** 设置每页条数, 重新计算当前页码并查询 */
  setSize(size: number) {
    const page = Math.ceil(((this.current - 1) * this.pageSize) / size) + 1
    this.pageParam = {
      size,
      current: page,
    }
    return this.request()
  }

  /** 更新数据 */
  update({ current, pageCount, pageSize, total, records = [] }: Obj) {
    this.current = current
    this.pageCount = pageCount
    this.pageSize = pageSize
    this.total = total
    this._status = current < pageCount ? 'more' : 'noMore'
    this.records = !this._ItemConstructor ? records : records.map((item: Obj) => new (this._ItemConstructor as Cls<T>)(item))
    return this.records
  }

  reload() {
    this.request()
  }

  /** 获取指定页码数据 */
  goPage(page: number) {
    page = page < 1 ? 1 : page > this.pageCount ? this.pageCount : page
    this.pageParam.current = page
    return this.request()
  }

  /** 是否还有下一页 */
  get hasNextPage(): boolean {
    return this.current < this.pageCount
  }

  /** 加载下一页数据  */
  loadMore() {
    if (this.current < this.pageCount) {
      const data = this.records
      return this.goPage(this.current + 1).then(records => {
        this.records = data.concat(records)
      })
    } else {
      return Promise.reject({ message: '已经是最后一页' })
    }
  }
}

export type Pages<P extends Obj, I> = {
    new <Para extends Obj = P>(param?: Obj): List<Para, I>
}

/** 分页查询类工厂方法
 * @param res 包含有getPageList方法的数据资源对象 或者指定查询请求方法
 * @param Info （可选）指定数据集合的实体类
 */
export function pagesExtend<Para extends Obj = Obj, I = Obj>(res: Obj | Fn<Promise<any>>, Info?: Cls<I>) {
  const _requestMethod = typeof res === 'function' ? res : res.getPageList.bind(res)
  class _Pages extends List<Para, I> {
    get _ItemConstructor() {
      return Info
    }
    protected _requestMethod(param: Obj) {
      const result = _interceptor && _interceptor(_requestMethod, param, typeof res !== 'function' ? <Resource>res : undefined)
      return (result instanceof Promise) ? result : _requestMethod(param)
    }
  }
  return _Pages as unknown as Pages<Para, I>
}
