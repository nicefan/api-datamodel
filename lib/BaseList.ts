import Resource from './Resource'

type ItemContructor<T> = new (...arg: any[]) => T
type RequestMethod = (param: Obj) => Promise<any>

/**
 * 列表抽象类 <参数类型定义>
 */
export default abstract class List<P extends Obj, T = any> {
  /** 集合类型构造器 */
  protected get _ItemConstructor(): void | ItemContructor<T> {
    return undefined
  }
  /** 请求方法定义 */
  protected abstract _requestMethod(arg0?: Obj): Promise<any>
  /** 默认请求参数 */
  protected _defaultParam?: Obj

  /** 保存用户查询参数 */
  protected _param?: Obj

  #pageParam: { current?: number; size?: number } = {}

  records: T[] = []
  /** 当前页 */
  current = 1
  /** 总页数 */
  totalPage = 1
  /** 每页大小 */
  size = 10
  /** 总条数 */
  total = 0
  /** 加载更多状态 */
  #status?: 'more' | 'noMore' | 'loading'

  constructor(param?: any) {
    if (param) {
      this.setDefaultParam(param)
    }
  }

  protected request() {
    this.#status = 'loading'
    const param = { ...this._defaultParam, ...this._param, page: this.#pageParam }
    return this._requestMethod(param).then((result) => {
      return this.update(result)
    })
  }

  get status() {
    return this.#status
  }

  setDefaultParam({ size, ...param }: { size?: number } & P) {
    this._defaultParam = { ...this._defaultParam, ...param }
    if (size) this.#pageParam.size = size
  }

  /** 查询请求数据 */
  query(param?: P) {
    delete this.#pageParam.current
    this._param = param && { ...param }
    return this.request().catch((e) => {
      this.records = []
      this.current = 1
      this.total = 0
      this.#status = 'noMore'
      return Promise.reject(e)
    })
  }

  /** 设置查询请求resource方法 */
  // setResMethod(method: RequestType<P>) {
  //   this._requestMethod = method
  // }

  /** 设置每页条数, 重新计算当前页码并查询 */
  setSize(size: number) {
    const page = Math.ceil(((this.current - 1) * this.size) / size) + 1
    this.#pageParam = {
      size,
      current: page,
    }
    // this._defaultParam = { ...this._defaultParam, pageSize: value }
    return this.request()
  }

  /** 更新数据 */
  update({ current, pages, size, total, records = [] }: Obj) {
    this.current = current
    this.totalPage = pages
    this.size = size
    this.total = total
    this.#status = current < pages ? 'more' : 'noMore'
    this.records = !this._ItemConstructor ? records : records.map((item: Obj) => new (this._ItemConstructor as Cls<T>)(item))
    return this.records
  }

  /** 清除查询条件重新查询 */
  // async reset() {
  //   this.param = undefined
  //   return this.query()
  // }
  reload() {
    this.request()
  }

  /** 获取指定页码数据 */
  async goPage(page: number) {
    page = page < 1 ? 1 : page > this.totalPage ? this.totalPage : page
    this.#pageParam.current = page
    return this.request()
  }

  /** 是否还有下一页 */
  get hasNextPage(): boolean {
    return this.current < this.totalPage
  }

  /** 加载下一页数据  */
  async loadMore() {
    if (this.current < this.totalPage) {
      const data = this.records
      const records = await this.goPage(this.current + 1)
      this.records = data.concat(records)
    } else {
      return Promise.reject({ message: '已经是最后一页' })
    }
  }
}

export declare class _P<P,I> extends List<P,I> {
  protected _requestMethod(arg0?: Obj): Promise<any>
}

export type Pages<P, I> = typeof _P & {
    new (param?: Obj): _P<P, I>
}

/** 分页查询类工厂方法
 * @param res 包含有getPageList方法的数据资源对象 或者指定查询请求方法
 * @param Info （可选）指定数据集合的实体类
 */
export function pagesFactory<Para = Obj, I = Obj>(res: Obj | RequestMethod, Info?: ItemContructor<I>) {
  const _requestMethod = typeof res === 'function' ? res : res.getPageList.bind(res)
  class _Pages extends List<Para, I> {
    get _ItemConstructor() {
      return Info
    }
    protected _requestMethod(param: Obj) {
      return _requestMethod(param)
    }
  }
  return _Pages as unknown as Pages<Para, I>
}

// export function listFactory<T = Obj>(res: Resource, Info?: ItemContructor<T>) {
//   class Super<Q = Obj> extends List<Q, T> {
//     protected _requestMethod(param: Obj) {
//       return res.getList(param).then(({ list }) => ({
//         records: list,
//         total: list.length,
//         size: 0,
//       }))
//     }
//   }
//   Reflect.defineProperty(Super.prototype, '_ItemConstructor', { value: Info })
//   return Super
// }
