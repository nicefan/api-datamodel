type ParamMothods<T, R> = T & ThisType<MixTypes<T, R>>
type Equal1<T, S> = [T] extends [S] ? ([S] extends [T] ? true : false) : false

type MixTypes<T, R> = R & {
  [P in keyof T]: T[P] extends keyof R
  ? R[T[P]] extends (...args: any) => infer RS 
      ? { <RE = RS>(...args: any): RE extends Promise<infer U> ? Equal1<U, unknown> extends true ? Promise<any> : Promise<U> : Promise<RE> }
      : never
    : T[P]
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

export function create<R, T extends Obj<keyof R> | Obj>(this: new (...arg: any) => R, name: string, methods?: ParamMothods<T, R>) {
  const res = new this(name)
  mixins(res, methods)

  return res as MixTypes<T, R>
}

type BindCreate<R> = <T extends Obj<keyof R> | Obj>(name: string, methods?: ParamMothods<T, R>) => MixTypes<T, R>
export default function factory<R>(this: new (...arg: any) => R) {
  const _this = this
  return function (...args) {
    return create.apply(_this, args)
  } as BindCreate<R>
}
