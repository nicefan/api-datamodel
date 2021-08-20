type Dict = {
  id: string
  label: string
  value: string
}

// 用户数据缓存
const dicts: Obj<DictResult> = {}

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

export class DictResult {
  list: Dict[] = []
  typeName: string
  private _map?: Obj
  private _status: 'ready'|'pending'|'loaded' = 'ready'
  promise: Promise<Dict[]>

  constructor(type: string, request: Fn<Promise<any>>) {
    this.typeName = type
    dicts[type] = this
    this.promise = this.load(request)
  }
  load(request: Fn<Promise<any>>) {
    this._status = 'pending'
    return request().then((dict) => {
      this._status = 'loaded'
      return (this.list = dict || [])
    },() => (this._status = 'ready'))
  }
  get status() {
    return this._status
  }
  get map() {
    if (!this._map && this.list.length > 0) {
      const map: Obj = {}
      for (const { value, label } of this.list) {
        map[value] = label
      }
      this._map = Object.freeze(map)
    }
    return this._map || {}
  }

  get value() {
    return this.list
  }

  then(callback: (value: Dict[]) => any) {
    this.promise.then(callback)
  }

}
