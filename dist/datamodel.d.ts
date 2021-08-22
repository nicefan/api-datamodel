/*
 * @Description:
 * @Autor: 范阳峰
 * @Date: 2020-07-06 17:17:59
 * @LastEditors: 范阳峰
 * @LastEditTime: 2021-08-22 17:29:56
 */

/// <reference types="../types" />

/** loading服务 */
interface LoadingServe {
  show(): void
  /** 结束loading,并处理状态消息 */
  close(data?: MessageData): void
}
/** uni-app 上传文件的请求参数 */
interface UniFormData {
  /** 要上传文件资源的路径。 */
  filePath: string
  /** 文件对应的参数名 */
  fileKey: string
  [key: string]: any
}

export declare class Http {
    static setAdapter(adapter: Adapter): void;
    protected defaultConfig: RequestConfig;
    /** 请求数据拦截，在子类实现 */
    protected interceptorResolve(data: any): any;
    /** 请求返回后可用于处理消息提示 */
    setMessage(msgData: MessageData | string): void;
    constructor(config?: RequestConfig);
    setDefault(config: RequestConfig): void;
    post(url: string, data?: Obj, config?: RequestConfig): Promise<any>;
    get(url: string, data?: Obj, config?: RequestConfig): Promise<any>;
    put(url: string, data?: Obj, config?: RequestConfig): Promise<any>;
    delete(url: string, data?: Obj, config?: RequestConfig): Promise<any>;
    request({ loading, ..._config }?: RequestConfig): Promise<any>;
}
declare type ParamMothods<T, R> = T & ThisType<MixTypes<T> & R>;
declare type MixTypes<T> = {
    [P in keyof T]: T[P] extends string ? {
        (...arg: any): Promise<T[P]>;
    } : T[P];
};
declare type ResCreate = <R, T extends Obj>(this: new (...arg: any) => R, param: string|RequestConfig, methods?: ParamMothods<T, R>)=> MixTypes<T> & R;
declare type BindCreate<C> = <T extends Obj>(param: string|RequestConfig, methods?: ParamMothods<T, C>) => MixTypes<T> & C;
declare type ResFactory = <R>(this: new (...arg: any) => R)=> BindCreate<R>;

// declare type ItemContructor<T> = new (...arg: any[]) => T;
// declare type RequestMethod = (param: Obj) => Promise<any>;

type Interceptor = (method: Fn<Promise<any>>, Params: Obj, res?: Resource) => Promise<PagesResult>
/**
 * 列表抽象类 <参数类型定义>
 */
declare abstract class List<P extends Obj = Obj, T = any> {
    /** 请求拦截器，用于格式化查询条件及返回数据的数据结构 */
    static setInterceptor:(func: Interceptor) => void;
     /** 集合类型构造器 */
    protected get _ItemConstructor(): void | Cls<T>;
    /** 请求方法定义 */
    protected abstract _requestMethod(arg0?: Obj): Promise<any>;
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
    setDefaultParam({ size, ...param }: {
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

declare class _P<P, I> extends List<P, I> {
    protected _requestMethod(arg0?: Obj): Promise<any>;
}
type Pages<P, I> = typeof _P & {
    new(param?: Obj): _P<P, I>
};
/** 分页查询类工厂方法
 * @param res 包含有getPageList方法的数据资源对象 或者指定查询请求方法
 * @param Info （可选）指定数据集合的实体类
 */
export declare function pagesExtend<Para = Obj, I = Obj>(res: Obj | Fn<Promise<any>>, Info?: Cls<I>): Pages<Para, I>;

/**
 * 传递对象默认属性值创建数据模型
 */
interface Ibase<T, D> {
    /** 通过id构建 */
    new (id?: string): T & D;
    /** JSON对象构建 */
    new (data?: Partial<D>): T & D;
    makePagesClass: typeof makePagesClass;
    createPages: typeof createPages;
}
/** 创建一个基于当前实体类的分页列表类 */
declare function makePagesClass<Para = Obj, T = Obj>(this: Cls<T>, method?: Fn<Promise<PagesResult>>): Pages<Para, T>;
/** 快速创建一个分页数据列表实例 */
declare function createPages<Para = Obj, T = Obj>(this: Cls<T>, defParam?: Obj, method?: Fn<Promise<PagesResult>>): _P<Para, T>;
declare abstract class Base {
    static extend: typeof infoExtend;
    static makePagesClass: typeof makePagesClass;
    static createPages: typeof createPages;
    /** 实例默认属性值，必须通过子类实现 */
    protected abstract get defaultProps(): Obj;
    /** 实例请求操作源，可在子类继承实现 */
    protected get res(): Resource;
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
declare class Info<R extends Resource> extends Base {
    protected get defaultProps(): Obj;
    protected get res(): R
}
export declare function infoExtend<I, R extends Resource>(DefaultData: Cls<I>, res?: R | string): Ibase<Info<R>, I> & { api: R };

declare class Resource extends Http {
    protected basePath: string;
    /** 工厂模式快速创建实例 */
    static create: ResCreate;
    static factory: ResFactory;
    static rootPath: string;

    constructor(config: string | RequestConfig);
    /** 定义业务请求数据处理逻辑 */
    protected interceptorResolve(response: any): any;
    request(config: RequestConfig): Promise<any>;

    /** 查询分页列表 */
    getPageList(param?: Obj): Promise<PagesResult>;

    /** formData表单格式上传文件 */
    upload(apiName: string, data: FormData | UniFormData, config?: RequestConfig): Promise<any>;
    /** 二进制流文件下载。
     * * 默认取请求头中的filename为文件名，可配置config.filename指定下载文件名(跨平台不支持，需自行在拦截器中配置)
     **/
    downloadFile(apiName: string, config?: RequestConfig): Promise<any>;
    getFile(apiName: string, param?: Obj, filename?: string): Promise<any>;
    /** 创建一个数据实体类 */
    makeInfoClass<T, R extends Resource>(this:R, Def: Cls<T>): Ibase<Info<R>, T>;
    /** 创建一个分页列表类 */
    makePagesClass<T, Qu = Obj>(Info?: Cls<T>, methodName?: string): Pages<Qu, T>;
    /** 快速创建一个无类型分页数据列表实例 */
    createPagesInstance<Param = Obj, T = Obj>(defParam?: Obj, method?: (param?: Obj<any> | undefined) => Promise<PagesResult>, Item?: Cls<T>): _P<Param, T>;
}
export declare const createApi: BindCreate<Resource>

/** 返回请求并缓存的数据 */
export declare function getDataCache<T extends Obj = Obj>(name: string, request: Fn<Promise<any>>, keyField?: string): CacheResult<T>;
declare class CacheResult<T extends Obj = Obj> {
    name: string;
    private _key?;
    list: T[];
    private _map?;
    private _status;
    private _dataType?;
    promise: Promise<T[]>;
    constructor(name: string, request: Fn<Promise<any>>, _key?: string | undefined);
    load(request: Fn<Promise<any>>): Promise<any>;
    get status(): "pending" | "ready" | "loaded";
    get map(): Record<string, any>;
    get value(): T[];
    then(callback: (value: T[]) => any): void;
}

interface Adapter {
    request: (config: RequestConfig) => Promise<unknown>;
    [key: string]: any;
}

type DefaultRequestConfig = Partial<Pick<RequestConfig, 'headers' | 'timeout' | 'withCredentials' | 'loading'>>
interface ApiConfig {
  /** 服务地址,http开头，后面不要加'/' */
  server: string
  /** 请求前缀 */
  rootPath: string
}
/** 初始化 */
interface InitConfig {
  /** APP api服务器配置 */
  apiConfig?: ApiConfig
  /** 默认请求配置 */
  defRequestConfig?: DefaultRequestConfig
  /** loading 组件服务 */
  loadingServe?: LoadingServe
}

export declare function setApiConfig(cfg: ApiConfig): void;

/** 默认请求参数配置 */
export declare function setDefRequestConfig(config: DefaultRequestConfig): void;
/** loading服务配置 */
export declare function setLoadingServe(loadingServe: LoadingServe): void;

export declare function serviceInit(adapter: Adapter, initConfig?: InitConfig): void;


export {
    List as BaseList,
    Base as BaseInfo,
    Resource as ApiResource
}
