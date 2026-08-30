type HttpConstructor<H extends Obj> = {
  new (optionsOrModulePath?: string | HttpOptions, instanceOptions?: HttpOptions): H
  defaultOptions: Partial<HttpOptions>
}
type ApiMethods<T, H> = T & ThisType<T & { readonly $http: H }>
type ApiInstance<T, H> = T & { readonly $http: H }

interface Service<H extends Obj> {
  readonly http: H
  readonly createApi: {
    <T extends Obj>(methods: ApiMethods<T, H>): ApiInstance<T, H>
    <T extends Obj>(modulePath: string, methods?: ApiMethods<T, H>): ApiInstance<T, H>
  }
  with(overrides: Partial<HttpOptions>): Service<H>
}

function mixin<T extends Obj, H extends Obj>(target: ApiInstance<T, H>, methods: T) {
  for (const key of Object.keys(methods)) {
    const value = methods[key]
    Reflect.set(target, key, typeof value === 'function' ? value.bind(target) : value)
  }
}

function buildService<H extends Obj>(BaseHttp: HttpConstructor<H>, options: HttpOptions): Service<H> {
  const currentOptions = { ...options }

  // 每个 Service 都直接从最初调用 createService 的 Http 类型派生。
  class ConfiguredHttp extends BaseHttp {
    static defaultOptions = currentOptions
  }

  const HttpType = ConfiguredHttp as HttpConstructor<H>
  const http = new HttpType()

  const createApi = <T extends Obj>(
    modulePathOrMethods: string | ApiMethods<T, H>,
    methods?: ApiMethods<T, H>
  ) => {
    const modulePath = typeof modulePathOrMethods === 'string' ? modulePathOrMethods : ''
    const apiMethods = (typeof modulePathOrMethods === 'string' ? methods : modulePathOrMethods) || ({} as T)
    const $http = new HttpType(modulePath)

    // 业务对象不继承底层请求方法，原型层只负责提供 $http。
    const apiPrototype = Object.create(Object.prototype)
    Object.defineProperty(apiPrototype, '$http', {
      value: $http,
      enumerable: false,
      configurable: false,
      writable: false,
    })

    const api = Object.create(apiPrototype)
    mixin(api, apiMethods)
    return api as ApiInstance<T, H>
  }

  return {
    http,
    createApi,
    with(overrides) {
      return buildService(BaseHttp, { ...currentOptions, ...overrides })
    },
  }
}

export { buildService }
export type { ApiInstance, ApiMethods, HttpConstructor, Service }
