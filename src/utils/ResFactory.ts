type ApiInstance<T, R> = MixTypes<T, R> & { readonly $http: R }
type ParamMethods<T, R> = T & ThisType<ApiInstance<T, R>>
type MixTypes<T, R> = Omit<R, keyof T> & T

function mixins(instance: Obj, methods: Obj = {}) {
  for (const key of Object.keys(methods)) {
    const method = methods[key]
    if (typeof method !== 'function') {
      throw new TypeError(`资源方法 ${key} 必须是函数`)
    }
    Reflect.set(instance, key, method.bind(instance))
  }
}

function setupHttp<R extends Obj>(instance: R) {
  const http = Object.create(Object.getPrototypeOf(instance))
  Object.defineProperties(http, Object.getOwnPropertyDescriptors(instance))
  Object.defineProperty(http, 'setMessage', {
    get: () => Reflect.get(instance, 'setMessage'),
    set: (value) => {
      Reflect.set(instance, 'setMessage', value)
    },
  })

  Object.defineProperty(instance, '$http', {
    value: http,
    enumerable: false,
    configurable: false,
    writable: false,
  })
}

export function create<R extends Obj, T extends Obj<Fn>>(
  this: new (...arg: any) => R,
  name: string,
  methods?: ParamMethods<T, R>,
  config?: DefOptions
) {
  const res = new this(name, config)
  setupHttp(res)
  mixins(res, methods)

  return res as unknown as ApiInstance<T, R>
}

type BindCreate<R> = <T extends Obj<Fn>>(name: string, methods?: ParamMethods<T, R>) => ApiInstance<T, R>

export default function factory<R extends Obj>(
  this: new (...arg: any) => R,
  config?: DefOptions
): BindCreate<R> {
  return (name, methods) => create.apply(this, [name, methods, config]) as any
}
