type Dict = {
  id: string
  label: string
  value: string
}

// 用户数据缓存
const dicts: Obj<DictResult> = {}

/** 异步获取字典 */
// export function getDict<T extends string>(type: T): Promise<Dict[]> {
//   if (dicts[type]) {
//     return Promise.resolve(dicts[type].list)
//   }
//   return new DictResult(type).promise
// }

/** 同步获取字典,返回一个可响应的字典对象 */
export function getDict(type: string, request: Fn<Promise<any>>) {
  const dict = dicts[type]
  if (!dict) {
    return new DictResult(type, request)
  } else if (dict.status === 'ready') {
    return dict.load(request)
  } else {
    return dict
  }
}

// function query(type: string) {
//   return commonApi.getDict(type).then((data: Obj<string>[]) => {
//     return data.map(({ value, label }) => Object.freeze({ id: value, value, label }))
//   })
// }

export class DictResult {
  list: Dict[] = []
  typeName: string
  #map?: Obj
  #status: 'ready'|'pending'|'loaded' = 'ready'
  promise: Promise<Dict[]>
  get status() {
    return this.#status
  }
  constructor(type: string, request: Fn<Promise<any>>) {
    this.typeName = type
    dicts[type] = this
    this.promise = this.load(request)
  }
  load(request: Fn<Promise<any>>) {
    this.#status = 'pending'
    return request().then((dict) => {
      this.#status = 'loaded'
      return (this.list = dict || [])
    },() => (this.#status = 'ready'))
  }
  get map() {
    if (!this.#map && this.list.length > 0) {
      const map: Obj = {}
      for (const { value, label } of this.list) {
        map[value] = label
      }
      this.#map = Object.freeze(map)
    }
    return this.#map || {}
  }

  get value() {
    return this.list
  }

  then(callback: (value: Dict[]) => any) {
    this.promise.then(callback)
  }

  private toString() {
    return this.list
  }
}
