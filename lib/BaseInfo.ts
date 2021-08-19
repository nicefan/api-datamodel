/* eslint-disable @typescript-eslint/no-empty-function */
import cloneDeep from 'lodash/cloneDeep'
import pick from 'lodash/pick'
// import isPlainObject from 'lodash/isPlainObject'
import Resource from './Resource';
import { pagesFactory } from './BaseList'


/**
 * 传递对象默认属性值创建数据模型
 */
export type Ibase<T extends Base, D> = {
  /** 通过id构建 */
  new (id?: string): T & D
  /** JSON对象构建 */
  new (data?: Partial<D>): T & D
  makePagesClass: typeof makePagesClass
  createPages: typeof createPages
}

/** 创建一个基于当前实体类的分页列表类 */
function makePagesClass<Para = Obj, T = Obj>(this: Cls<T>, method?: Fn<Promise<PagesResult>>) {
  return pagesFactory<Para, T>(method || this.prototype.res, this)
}
/** 快速创建一个分页数据列表实例 */
function createPages<Para = Obj, T = Obj>(this: Cls<T>, defParam?: Obj, method?: Fn<Promise<PagesResult>>) {
  return (this.prototype.res as Resource).createPagesInstance<Para, T>(defParam, method, this)
}

abstract class Base {
  static extend = infoFactory

  static makePagesClass = makePagesClass
  static createPages = createPages

  /** 实例默认属性值，必须通过子类实现 */
  protected abstract get defaultProps(): Obj

  /** 实例请求操作源，可在子类继承实现 */
  protected get res(): Resource {
    throw new TypeError('未指定请求方法')
  }

  /** 原始数据 */
  protected _data!: Obj

  constructor(data?: any) {
    this.initProps()
    this.init(data)

    if (typeof data === 'string') {
      this.reset({ id: data })
      this.load(data)
    } else {
      this.reset(data)
    }
  }

  private initProps() {
    // 解决小程序无法读取原型链上get属性的问题
    // const proto1 = Reflect.getPrototypeOf(this)
    // if (proto1) {
    //   const names = Object.getOwnPropertyNames(proto1)
    //   for (const key of names) {
    //     const descriptor = Reflect.getOwnPropertyDescriptor(proto1, key)
    //     if (descriptor?.get) {
    //       Object.defineProperty(this, key, { ...descriptor, enumerable: true })
    //     }
    //   }
    // }
    // 扩展基础属性
    for (const key of Object.keys(this.defaultProps)) {
      Object.defineProperty(this, key, {
        enumerable: true,
        configurable: true,
        get() {
          return this._data[key]
        },
        set(value) {
          this._data[key] = value
        },
      })
    }
  }

  /** 对象初始化时执行
   * @param data 初始化实例时的参数
   */
  protected init(data?: any): void {}

  /** 数据更新前置处理 */
  protected onUpdateBefore(data?: any): any {}

  /** 数据异步加载前置处理 */
  protected onLoadAfter<T>(data: T): T | void {
    return data
  }

  // TODO: 区分初始化数据 和 重置数据！ 全量的数据变化应该返回一个新对象来响应vue检测变化
  /** 数据重置更新 */
  reset(data?: any) {
    const _data = this.onUpdateBefore(data) || data
    const _def = cloneDeep(this.defaultProps)
    if (_data) {
      this._data = { ..._data }
      for (const key of Object.keys(_def)) {
        this._data[key] = this._data[key] ?? _def[key]
      }
    } else {
      this._data = _def
    }
  }

  /** 实例构造时传的id,将调用此方法加载数据， */
  async load(id: string) {
    const result = await this.res.get(id)
    const data = this.onLoadAfter(result) || result
    this.reset(data)
    return data
  }

  /** 删除id */
  // protected async delete() {
  //   const id = this._data.id
  //   return await this.res?.delete(id)
  // }

  // protected async save() {
  //   return await this.res?.save(this.getObject())
  // }

  // async update(newData: Obj) {
  //   const result = await this.res.save({ ...newData, oldRequestData: this.getObject() })
  //   this.reset(newData)
  //   return result
  // }

  /** 克隆实体类 */
  clone() {
    const newItem = Reflect.construct(this.constructor, [])
    newItem._data = cloneDeep(this._data)
    for (const key of Object.keys(this)) {
      if (!Reflect.has(this.defaultProps, key)) {
        const descriptor = Reflect.getOwnPropertyDescriptor(this, key)
        if (descriptor?.writable) {
          newItem[key] = cloneDeep(Reflect.get(this, key))
        }
      }
    }
    return newItem
  }

  /** 合并内容 */
  assign(data: Obj) {
    this.reset({ ...this._data, ...data })
  }

  /** 获取源始数据 */
  getOriginal() {
    return cloneDeep(this._data)
  }

  /** 获取基础属性的标准对象 */
  getObject() {
    return cloneDeep(pick(this._data, Object.keys(this.defaultProps)))
  }
}

// 在原型链上添加属性
function decorator<T extends Base, D extends Obj>(target: Cls<T>, defaultProps: D) {
  for (const key of Object.keys(defaultProps)) {
    Object.defineProperty(target.prototype, key, {
      enumerable: true,
      configurable: true,
      get() {
        return this._data[key] // ?? cloneDeep(this.defaultProps[key])
      },
      set(value) {
        this._data[key] = value
      },
    })
  }
  return target as Ibase<T, D>
}

export declare class Info extends Base {
  protected get defaultProps(): Obj
}

function infoFactory<I, R extends Resource>(DefaultData: Cls<I>, res?: R | string) {
  const _defaultData = new DefaultData()
  const _res = typeof res === 'string' ? new Resource(res) : res
  class _Info extends Base {
    static api = _res

    protected get defaultProps() {
      return _defaultData
    }

    get res() {
      return _res || super.res
    }
  }
  return (_Info as unknown) as Ibase<Info, I> & { api: R }
  // return decorator(Info, _defaultData)
}

export { infoFactory }
export default Base
