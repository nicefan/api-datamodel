type ParamMothods<T, R> = T & ThisType<MixTypes<T> & R>

type MixTypes<T> = {
  [P in keyof T]: T[P] extends string ? { (...arg: any): Promise<T[P]> } : T[P]
}

function mixins(instance: Obj, methods: Obj = {}) {
  for (const key of Object.keys(methods)) {
    let method = methods[key]
    if (typeof method === 'string') {
      const target = Reflect.get(instance, method)
      if (!target) break
      method = (param: any) => Reflect.apply(target, instance, [key, param])
    }
    Reflect.set(instance, key, method.bind(instance))
  }
}

export function create<R, T extends Obj>(this: new (...arg: any) => R, param: string| RequestConfig, methods?: ParamMothods<T, R>) {
  const res = new this(param)
  mixins(res, methods)

  return res as MixTypes<T> & R
}

type BindCreate<C> = <T extends Obj>(param: string|RequestConfig, methods?: ParamMothods<T, C>) => MixTypes<T> & C
export default function factory<R>(this: new (...arg: any) => R) {
  const _this = this
  return function (...args) {
    return create.apply(_this, args)
  } as BindCreate<R>
}
