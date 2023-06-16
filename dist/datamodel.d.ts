/*
 * @Description:
 * @Autor: 范阳峰
 * @Date: 2020-07-06 17:17:59
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2022-09-07 13:40:18
 */

/// <reference types="../types" />

/** loading服务 */
interface LoadingServe {
  show(): void;
  /** 结束loading,并处理状态消息 */
  close(data?: MessageData): void;
}
/** uni-app 上传文件的请求参数 */
interface UniFormData {
  /** 要上传文件资源的路径。 */
  filePath: string;
  /** 文件对应的参数名 */
  fileKey: string;
  [key: string]: any;
}

export declare class Http {
  /** 工厂模式快速创建实例 */
  static create: ResCreate;
  static factory: ResFactory;
  protected static options: DefOptions;
  private options: DefOptions;
  protected defaultConfig: RequestConfig;
  /** 请求数据拦截 */
  protected interceptorResolve(data: any): any;
  /** 请求返回后可用于处理消息提示 */
  setMessage(msgData: MessageData | string): void;
  constructor(config?: DefOptions);
  constructor(name: string, config?: DefOptions);
  protected setDefault(config: RequestConfig): void;
  post<T = any>(url: string, data?: Obj, config?: RequestConfig): Promise<T>;
  get<T = any>(url: string, data?: Obj, config?: RequestConfig): Promise<T>;
  put<T = any>(url: string, data?: Obj, config?: RequestConfig): Promise<T>;
  delete<T = any>(url: string, data?: Obj, config?: RequestConfig): Promise<T>;
  /** 定义业务请求数据处理逻辑 */
  request<T = any>(url: string, config?: RequestConfig): Promise<T>;
}

declare type ParamMothods<T, R> = T & ThisType<MixTypes<T, R>>;

declare type MixTypes<T, R> = R & {
  [P in keyof T]: T[P] extends keyof R
    ? R[T[P]] extends (...args: any) => infer RS
      ? { <RE = RS>(...args: any): RE extends RS ? RS : Promise<RE> }
      : never
    : T[P];
};

type ModuleName<T extends string> = T extends `${string}/` ? never : T;

declare type ResCreate = <R, S extends string, T extends Obj<keyof R> | Obj>(
  this: new (...arg: any) => R,
  name?: ModuleName<S>,
  methods?: ParamMothods<T, R>,
  config?: DefOptions
) => MixTypes<T, R>;
declare type BindCreate<R> = <S extends string, T extends Obj<keyof R> | Obj>(
  name?: ModuleName<S>,
  methods?: ParamMothods<T, R>,
  config?: DefOptions
) => MixTypes<T, R>;
declare type ResFactory = <R>(
  this: new (...arg: any) => R,
  config?: DefOptions
) => BindCreate<R>;
declare class Resource<S extends string = string> extends Http {
  /** formData表单格式上传文件 */
  upload(
    apiName: string,
    data: FormData | UniFormData,
    config?: RequestConfig
  ): Promise<any>;
  /** 二进制流文件下载。
   * * 默认取请求头中的filename为文件名，可配置config.filename指定下载文件名(跨平台不支持，需自行在拦截器中配置)
   **/
  downloadFile(
    apiName: string,
    config?: RequestConfig
  ): Promise<{ filename: string; data: any }>;
  // getFile(apiName: string, param?: Obj, filename?: string): Promise<any>;
  /** 创建一个分页列表类 */
  makePagesClass<T, Qu extends Obj = Obj>(
    Info?: Cls<T>,
    methodName?: string
  ): Pages<Qu, T>;
  /** 快速创建一个无类型分页数据列表实例 */
  createPagesInstance<Param extends Obj = Obj, T = Obj>(
    defParam?: Obj,
    method?: Fn,
    Item?: Cls<T>
  ): List<Param, T>;
}

// declare type ItemContructor<T> = new (...arg: any[]) => T;
// declare type RequestMethod = (param: Obj) => Promise<any>;

type Interceptor = (
  method: Fn<Promise<any>>,
  Params: Obj,
  res?: Resource
) => Promise<PagesResult>;
/**
 * 列表抽象类 <参数类型定义>
 */
declare class List<P extends Obj = Obj, T = any> {
  /** 集合类型构造器 */
  protected get _ItemConstructor(): void | Cls<T>;
  /** 请求方法定义 */
  protected _requestMethod(arg0?: Obj): Promise<any>;
  /** 默认请求参数 */
  protected _defaultParam?: Obj;
  /** 保存用户查询参数 */
  protected _param?: Obj;
  records: T[];
  /** 当前页 */
  current: number;
  /** 总页数 */
  pageCount: number;
  /** 每页大小 */
  pageSize: number;
  /** 总条数 */
  total: number;
  constructor(param?: any);
  protected request(): Promise<T[]>;
  get status(): "loading" | "more" | "noMore" | undefined;
  setDefaultParam({
    size,
    ...param
  }: {
    size?: number;
  } & P): void;
  /** 查询请求数据 */
  query(param?: P): Promise<T[]>;
  /** 设置查询请求resource方法 */
  /** 设置每页条数, 重新计算当前页码并查询 */
  setSize(size: number): Promise<T[]>;
  /** 更新数据 */
  update(data: PagesResult): T[];
  /** 清除查询条件重新查询 */
  reload(): void;
  /** 获取指定页码数据 */
  goPage(page: number): Promise<T[]>;
  /** 是否还有下一页 */
  get hasNextPage(): boolean;
  /** 加载下一页数据  */
  loadMore(): Promise<undefined>;
}

type Pages<P extends Obj, I> = {
  new <Para extends Obj = P>(param?: P): List<Para, I>;
};
/** 分页查询类工厂方法
 * @param res 包含有getPageList方法的数据资源对象 或者指定查询请求方法
 * @param Info （可选）指定数据集合的实体类
 */
export declare function pagesExtend<Para extends Obj = Obj, I = Obj>(
  res: Obj | Fn<Promise<any>>,
  Info?: Cls<I>
): Pages<Para, I>;

/**
 * 传递对象默认属性值创建数据模型
 */
export type Ibase<T extends typeof Base, D, R extends Obj = Resource> = {
  /** 通过id构建 */
  new (id?: string): InstanceType<T> & Base<R> & D;
  /** JSON对象构建 */
  new (data?: Partial<D>): InstanceType<T> & Base<R> & D;
  makePagesClass: typeof makePagesClass;
  createPages: typeof createPages;
  api: R;
};

/** 创建一个基于当前实体类的分页列表类 */
declare function makePagesClass<Para extends Obj = Obj, T = Obj>(
  this: Cls<T>,
  method?: Fn<Promise<PagesResult>>
): Pages<Para, T>;
/** 快速创建一个分页数据列表实例 */
declare function createPages<Para extends Obj = Obj, T = Obj>(
  this: Cls<T>,
  defParam?: Obj,
  method?: Fn<Promise<PagesResult>>
): List<Para, T>;
declare class Base<R extends Obj = Http> {
  static extend: typeof infoExtend;
  static createFactory: typeof BaseFactory;
  static makePagesClass: typeof makePagesClass;
  static createPages: typeof createPages;
  /** 实例默认属性值，必须通过子类实现 */
  protected get defaultProps(): Obj;
  /** 实例请求操作源，可在子类继承实现 */
  protected get api(): R;
  /** 原始数据 */
  protected _data: Obj;
  constructor(data?: any);
  private initProps;
  /** 对象初始化时执行
   * @param data 初始化实例时的参数
   */
  protected init(data?: any): void;
  /** 数据更新前置处理 */
  protected onUpdateBefore(data?: any): any;
  /** 数据异步加载前置处理 */
  protected onLoadAfter<T>(data: T): T | void;
  /** 数据重置更新 */
  reset(data?: any): void;
  /** 实例构造时传的id,将调用此方法加载数据， */
  load(id: string): Promise<any>;
  /** 删除id */
  /** 克隆实体类 */
  clone(): any;
  /** 合并内容 */
  assign(data: Obj): void;
  /** 获取源始数据 */
  getOriginal(): Obj<any>;
  /** 获取基础属性的标准对象 */
  getObject(): Pick<Obj<any>, string>;
}
export declare function infoExtend<I, R extends Http, T extends typeof Base>(
  this: T | void,
  DefaultData: Cls<I>,
  res?: R | string
): Ibase<T, I, R>;
type BindInfo<T extends typeof Base> = <I, R extends Http>(
  DefaultData: Cls<I>,
  res?: R | string
) => Ibase<T, I, R>;
export declare function BaseFactory<T extends typeof Base>(
  this: T
): BindInfo<T>;

/**
 * 返回请求并缓存的数据
 * @param name 缓存名称
 * @param request 请求方法，转递`name`作为参数
 * @param keyField 指定key字段，用于map对象的键值
 */
export declare function getDataCache<T extends Obj>(
  name: string,
  request: (name: string) => Promise<T[]>,
  keyField?: string
): CacheResult<T>;
/** 清理缓存，刷新数据, */
export declare function clearDataCache(name: string): void;
export declare function clearAllCache(): void;

type CacheParam<T = any, P extends any[] = any> = {
  request: (...args:P) => Promise<T>;
  keyField?: string;
  labelField?: string;
};
interface SyncData<T> {
  reload: () => Promise<SyncData<T>>;
  status: "ready" | "pending" | "loaded";
  res?: T[];
  keyField?: string;
  labelField?: string;
}

type DictMap<T> = Record<
  string,
  T extends { value: any; label: string } ? string : T
>;
export declare class CacheResult<T extends Obj = Obj> {
  name: string;
  private _list?: T[];
  private _map?: DictMap<T>;
  private _promise: Promise<SyncData<T>>;
  constructor(name: string, request: Fn<Promise<any>>);
  constructor(name: string, config: CacheParam);
  reload(): Promise<SyncData<T>>;
  getRecords(): Promise<T[]>;
  getMap(): Promise<DictMap<T>>;
  get map(): DictMap<T>;
  get records(): T[];
}

type RequestReturn<T extends Fn | CacheParam> = ReturnType<
  T extends { request: infer P } ? P : T
> extends Promise<infer R>
  ? R extends Obj[]
    ? R[0]
    : never
  : never;

interface BuildCache {
  <T extends Obj>(request: (name: string) => Promise<T[]>, store?: Obj): {
    store: { [key: string]: CacheResult<T> };
    getData: (name: string) => CacheResult<T>;
  };
  <T extends Obj<Fn | CacheParam>>(config: T, store?: Obj): {
    store: { [K in keyof T]: CacheResult<RequestReturn<T[K]>> };
    getData: {
      <K extends keyof Omit<T, "default">>(name: K): CacheResult<
        RequestReturn<T[K]>
      >;
      (name: string): CacheResult<RequestReturn<T["default"]>>;
    };
  };
}
export const buildCache:BuildCache

export declare function createCache(data: Obj): {
  defineGroup<T extends Obj>(api: CacheParam<T> | CacheParam<T>["request"]): (name:string) => CacheResult<T>
  defineSingle<T extends Obj>(api: CacheParam<T> | CacheParam<T>["request"]) : () => CacheResult<T>

}
interface Adapter {
  (url: string, config: RequestConfig): Promise<any>;
  [key: string]: any;
}

type DefaultRequestConfig = Partial<
  Pick<RequestConfig, "headers" | "timeout" | "withCredentials" | "backendLoad">
>;

interface DefOptions {
  /** 请求适配器，包含有request方法的对象，如：axios */
  adapter: Adapter;
  /** 不同环境的服务器地址或代理前缀 */
  serverUrl?: string;
  /** 业务请求前缀 */
  rootPath?: string;
  /** 默认请求配置 */
  defRequestConfig?: DefaultRequestConfig;
  /** 请求前拦截处理 */
  requestInterceptors?: (config: RequestConfig) => RequestConfig;
  /** 定义业务请求数据处理逻辑 */
  transformResponse?: (result: Obj) => {
    code: number;
    message: string;
    data: Obj;
    success: boolean;
  };
}

/** 初始化 */
type InitConfig = DefOptions & {
  /** loading 组件服务 */
  loadingServe?: LoadingServe;
};
/** 创建一个请求服务 */
export declare function createServer(options: DefOptions): typeof Resource;
/** loading服务配置 */
export declare function setLoadingServe(loadingServe: LoadingServe): void;
/** 初始化数据服务 */
export declare function setGlobalConfig(initConfig?: InitConfig): void;
/** 定义服务配置选项 */
export declare function defineConfig<T = DefOptions>(options?: T): T;
/** 配置全局请求参数，并返回一个服务工厂方法 */
export declare function serviceInit(
  initConfig?: InitConfig
): BindCreate<Resource>;

export declare function buildAdapter<F extends Obj>(frame: F): Adapter;
export { List as BaseList, Base as BaseInfo, Resource as ApiResource };
