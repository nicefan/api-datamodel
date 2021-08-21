import merge from 'lodash/merge';
import cloneDeep from 'lodash/cloneDeep';
import pick from 'lodash/pick';

function mixins(instance, methods = {}) {
    for (const key of Object.keys(methods)) {
        let method = methods[key];
        if (typeof method === 'string') {
            const target = Reflect.get(instance, method);
            if (!target)
                break;
            method = (param) => Reflect.apply(target, instance, [key, param]);
        }
        Reflect.set(instance, key, method.bind(instance));
    }
}
function create(param, methods) {
    const res = new this(param);
    mixins(res, methods);
    return res;
}
function factory() {
    const _this = this;
    return function (...args) {
        return create.apply(_this, args);
    };
}

let _interceptor;
/**
 * 列表抽象类 <参数类型定义>
 */
class List {
    static setInterceptor(func) {
        _interceptor = func;
    }
    /** 集合类型构造器 */
    get _ItemConstructor() {
        return undefined;
    }
    /** 默认请求参数 */
    _defaultParam;
    /** 保存用户查询参数 */
    _param;
    pageParam = {};
    records = [];
    /** 当前页 */
    current = 1;
    /** 总页数 */
    pageCount = 1;
    /** 每页大小 */
    pageSize = 10;
    /** 总条数 */
    total = 0;
    /** 加载更多状态 */
    _status;
    constructor(param) {
        if (param) {
            this.setDefaultParam(param);
        }
    }
    request() {
        this._status = 'loading';
        const param = { ...this._defaultParam, ...this._param, page: this.pageParam };
        return this._requestMethod(param).then((result) => {
            return this.update(result);
        });
    }
    get status() {
        return this._status;
    }
    setDefaultParam({ size, ...param }) {
        this._defaultParam = { ...this._defaultParam, ...param };
        if (size)
            this.pageParam.size = size;
    }
    /** 查询请求数据 */
    query(param) {
        delete this.pageParam.current;
        this._param = param && { ...param };
        return this.request().catch((e) => {
            this.records = [];
            this.current = 1;
            this.total = 0;
            this._status = 'noMore';
            return Promise.reject(e);
        });
    }
    /** 设置每页条数, 重新计算当前页码并查询 */
    setSize(size) {
        const page = Math.ceil(((this.current - 1) * this.pageSize) / size) + 1;
        this.pageParam = {
            size,
            current: page,
        };
        return this.request();
    }
    /** 更新数据 */
    update({ current, pageCount, pageSize, total, records = [] }) {
        this.current = current;
        this.pageCount = pageCount;
        this.pageSize = pageSize;
        this.total = total;
        this._status = current < pageCount ? 'more' : 'noMore';
        this.records = !this._ItemConstructor ? records : records.map((item) => new this._ItemConstructor(item));
        return this.records;
    }
    refresh() {
        this.request();
    }
    /** 获取指定页码数据 */
    async goPage(page) {
        page = page < 1 ? 1 : page > this.pageCount ? this.pageCount : page;
        this.pageParam.current = page;
        return this.request();
    }
    /** 是否还有下一页 */
    get hasNextPage() {
        return this.current < this.pageCount;
    }
    /** 加载下一页数据  */
    async loadMore() {
        if (this.current < this.pageCount) {
            const data = this.records;
            const records = await this.goPage(this.current + 1);
            this.records = data.concat(records);
        }
        else {
            return Promise.reject({ message: '已经是最后一页' });
        }
    }
}
/** 分页查询类工厂方法
 * @param res 包含有getPageList方法的数据资源对象 或者指定查询请求方法
 * @param Info （可选）指定数据集合的实体类
 */
function pagesExtend(res, Info) {
    const _requestMethod = typeof res === 'function' ? res : res.getPageList.bind(res);
    class _Pages extends List {
        get _ItemConstructor() {
            return Info;
        }
        _requestMethod(param) {
            const result = _interceptor && _interceptor(_requestMethod, param, typeof res !== 'function' ? res : undefined);
            return (result instanceof Promise) ? result : _requestMethod(param);
        }
    }
    return _Pages;
}

/** 创建一个基于当前实体类的分页列表类 */
function makePagesClass(method) {
    return pagesExtend(method || this.prototype.res, this);
}
/** 快速创建一个分页数据列表实例 */
function createPages(defParam, method) {
    return this.prototype.res.createPagesInstance(defParam, method, this);
}
class Base {
    static extend = infoExtend;
    static makePagesClass = makePagesClass;
    static createPages = createPages;
    /** 实例请求操作源，可在子类继承实现 */
    get res() {
        throw new TypeError('未指定请求方法');
    }
    /** 原始数据 */
    _data;
    constructor(data) {
        this.initProps();
        this.init(data);
        if (typeof data === 'string') {
            this.reset({ id: data });
            this.load(data);
        }
        else {
            this.reset(data);
        }
    }
    initProps() {
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
                    return this._data[key];
                },
                set(value) {
                    this._data[key] = value;
                },
            });
        }
    }
    /** 对象初始化时执行
     * @param data 初始化实例时的参数
     */
    init(data) { }
    /** 数据更新前置处理 */
    onUpdateBefore(data) { }
    /** 数据异步加载前置处理 */
    onLoadAfter(data) {
        return data;
    }
    // TODO: 区分初始化数据 和 重置数据！ 全量的数据变化应该返回一个新对象来响应vue检测变化
    /** 数据重置更新 */
    reset(data) {
        const _data = this.onUpdateBefore(data) || data;
        const _def = cloneDeep(this.defaultProps);
        if (_data) {
            this._data = { ..._data };
            for (const key of Object.keys(_def)) {
                this._data[key] = this._data[key] ?? _def[key];
            }
        }
        else {
            this._data = _def;
        }
    }
    /** 实例构造时传的id,将调用此方法加载数据， */
    async load(id) {
        const result = await this.res.get(id);
        const data = this.onLoadAfter(result) || result;
        this.reset(data);
        return data;
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
        const newItem = Reflect.construct(this.constructor, []);
        newItem._data = cloneDeep(this._data);
        for (const key of Object.keys(this)) {
            if (!Reflect.has(this.defaultProps, key)) {
                const descriptor = Reflect.getOwnPropertyDescriptor(this, key);
                if (descriptor?.writable) {
                    newItem[key] = cloneDeep(Reflect.get(this, key));
                }
            }
        }
        return newItem;
    }
    /** 合并内容 */
    assign(data) {
        this.reset({ ...this._data, ...data });
    }
    /** 获取源始数据 */
    getOriginal() {
        return cloneDeep(this._data);
    }
    /** 获取基础属性的标准对象 */
    getObject() {
        return cloneDeep(pick(this._data, Object.keys(this.defaultProps)));
    }
}
function infoExtend(DefaultData, res) {
    const _defaultData = new DefaultData();
    const _res = typeof res === 'string' ? new Resource(res) : res;
    class _Info extends Base {
        static api = _res;
        get defaultProps() {
            return _defaultData;
        }
        get res() {
            return _res || super.res;
        }
    }
    return _Info;
    // return decorator(Info, _defaultData)
}

const { server, rootPath } = getApiConfig();
class Resource extends Http {
    /** 工厂模式快速创建实例 */
    static create = create;
    static factory = factory;
    static rootPath = server + rootPath;
    /**通过继承生成自定类时，可以指定该属性实现多服务器请求 */
    basePath = '';
    constructor(config = '') {
        super();
        let _baseUrl = '';
        if (typeof config === 'string') {
            _baseUrl = config;
        }
        else {
            const { baseURL = '', ..._config } = config;
            _baseUrl = baseURL;
            this.setDefault(config);
        }
        this.basePath = _baseUrl;
    }
    /** 定义业务请求数据处理逻辑 */
    interceptorResolve(response) {
        const { code, msg: message, data } = response.data;
        if (code === 0) {
            this.setMessage({ code, message });
            return data;
        }
        else {
            return Promise.reject({ ...response, code, message, setMessage: this.setMessage });
        }
    }
    request(config) {
        const _config = merge({}, getDefRequestConfig(), this.defaultConfig, config, {
            baseURL: Resource.rootPath + '/' + this.basePath,
        });
        return super.request(_config);
    }
    /** 查询分页列表 */
    getPageList(param) {
        return super.post('page', param);
    }
    /** formData表单格式上传文件 */
    upload(apiName, data, config) {
        return super.post(apiName, data, {
            headers: { 'content-type': 'multipart/form-data' },
            ...config,
        });
    }
    /** 二进制流文件下载。
     * * 默认取请求头中的filename为文件名，可配置config.filename指定下载文件名(跨平台不支持，需自行在拦截器中配置)
     **/
    downloadFile(apiName, config) {
        return this.request({
            responseType: 'blob',
            url: apiName,
            method: 'POST',
            ...config,
        });
    }
    /** 创建一个数据实体类 */
    makeInfoClass(Def) {
        return infoExtend(Def, this);
    }
    /** 创建一个分页列表类 */
    makePagesClass(Info, methodName = 'page') {
        const queryMethod = (param) => this.post(methodName, param);
        return pagesExtend(queryMethod, Info);
    }
    /** 快速创建一个无类型分页数据列表实例 */
    createPagesInstance(defParam, method = this.getPageList, Item) {
        return new (pagesExtend(method.bind(this), Item))(defParam);
    }
}
const createApi = Resource.factory();

const _apiConfig = {
    server: '',
    rootPath: '/api',
};
function setApiConfig({ server = '', rootPath = '' }) {
    Object.assign(_apiConfig, { server, rootPath });
    Resource.rootPath = server + rootPath;
}
function getApiConfig() {
    return _apiConfig;
}
const _defRequestConfig = {
    timeout: 50000,
    headers: {
        'content-type': 'application/json',
    },
};
/** 默认请求参数配置 */
function setDefRequestConfig(config) {
    merge(_defRequestConfig, config);
}
function getDefRequestConfig() {
    return _defRequestConfig;
}
let _loadingServe;
/** loading服务配置 */
function setLoadingServe(loadingServe) {
    _loadingServe = loadingServe;
}
function getLoadingServe() {
    if (!_loadingServe)
        throw new Error('请先执行平台初始化！');
    return _loadingServe;
}
/**
 * 初始化数据服务
 * @param adapter 请求模块 axios
 * @param config -{ apiConfig, defRequestConfig, loadingServe }
 */
function serviceInit(adapter, { apiConfig, loadingServe, defRequestConfig } = {}) {
    Http.setAdapter(adapter);
    if (apiConfig) {
        setApiConfig(apiConfig);
    }
    if (loadingServe) {
        setLoadingServe(loadingServe);
    }
    if (defRequestConfig) {
        setDefRequestConfig(defRequestConfig);
    }
}

let state = 'ready';
/** pending请求次数 */
let pendNum = 0;
/** 关闭loading计时器 */
let timeout;
/** 显示loading计时器 */
let showTimeout;
let msgData;
const LoadingServe = getLoadingServe;
/**
 * 开始一个请求加入列队
 * @param {boolean} immed 不做延时，立即显示
 */
function start(immed = false) {
    if (state === 'ready') {
        pendNum = 1;
        state = 'pending';
        // 等待200毫秒进入加载状态， 如果在这之前执行close方法，将清除此计时器
        showTimeout = setTimeout(() => {
            if (state !== 'pending')
                return;
            LoadingServe().show();
            state = 'loading';
        }, immed ? 0 : 200);
    }
    else {
        pendNum++;
    }
}
function complete(data) {
    if (data?.message)
        msgData = data;
    pendNum--;
    if (state === 'ready') {
        // 没有启动loading时也可以显示消息
        showMessage();
    }
    else if (pendNum <= 0) {
        if (state === 'pending') {
            // 没有并发请求时立即取消loading
            clearTimeout(showTimeout);
            showMessage();
        }
        else if (state === 'loading') {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                showMessage();
            }, 100);
        }
    }
}
/** 加载完成显示的消息 */
function showMessage(data = msgData) {
    LoadingServe().close(data);
    msgData = undefined;
    state = 'ready';
    clearTimeout(showTimeout);
    clearTimeout(timeout);
}
var taskStack = {
    start,
    complete,
    showMessage,
};

class Handle {
    showLoading;
    /** 手动设置消息数据 */
    _md;
    _orginData;
    constructor(showLoading = true) {
        this.showLoading = showLoading;
        if (showLoading)
            taskStack.start();
    }
    proxy(request) {
        const _promise = request.then((res) => this.setup(res), (err) => this.setup(err));
        return _promise;
        // 使用代理模式，通过用户在promise接收数据后，使用return返回消息
        // const interceptor = ProxyPromise(_promise)
        // interceptor.result(this.send)
        // return interceptor
    }
    isInit = false;
    setup(data) {
        this._orginData = data;
        if (this.isInit)
            return;
        this.isInit = true;
        // 延后执行消息处理
        setTimeout(() => {
            this.handle();
        }, 1);
    }
    /** 替换消息，消息类型按请求状态，空字符串将取消显示后台消息 */
    setMessage(msgData) {
        if (!msgData) {
            this._md = { code: 0, message: '' };
        }
        else if (typeof msgData === 'string') {
            this._md = { message: msgData };
        }
        else {
            this._md = { ...msgData };
        }
    }
    handle() {
        const data = { ...this._orginData, ...this._md };
        let msgData;
        const { code, message, type } = data;
        if (code) {
            const _message = this.formatError(code, message);
            msgData = { ...data, type: 'error', message: _message };
        }
        else if (typeof message === 'string') {
            msgData = {
                ...data,
                // 后台返回null表示无消息处理！
                message,
                type: type || 'success',
            };
        }
        if (this.showLoading) {
            taskStack.complete(msgData);
        }
    }
    // 请求异常处理
    formatError(code, _message = '') {
        let message = _message;
        if (code === 401 || code === -2) {
            const patrn = /.*[\u4e00-\u9fa5]+.*$/;
            message = patrn.test(message) ? message : '授权失败，请重新登录';
            // message = '授权失败，请重新登录'
        }
        else if (code === 408 || code === 'ECONNABORTED') {
            message = '连接超时';
        }
        else if (message === 'Network Error') {
            message = '网络连接失败';
        }
        else if (code === 500) {
            message = message || '内部服务器错误';
        }
        return message;
    }
}

let _adapter;
class Http {
    /** 设置请求处理对象 */
    static setAdapter(adapter) {
        _adapter = adapter;
    }
    defaultConfig = {};
    /** 请求数据拦截，在子类实现 */
    interceptorResolve(data) {
        return data;
    }
    /** 请求返回后可用于处理消息提示 */
    setMessage;
    constructor(config) {
        config && this.setDefault(config);
    }
    setDefault(config) {
        merge(this.defaultConfig, config);
    }
    post(url, data, config = {}) {
        return this.request({
            ...config,
            url,
            data,
            method: 'POST',
        });
    }
    get(url, data, config = {}) {
        return this.request({
            ...config,
            url,
            method: 'GET',
            params: data,
        });
    }
    put(url, data, config = {}) {
        return this.request({
            ...config,
            url,
            data,
            method: 'PUT',
        });
    }
    delete(url, data, config = {}) {
        return this.request({
            ...config,
            url,
            data,
            method: 'DELETE',
        });
    }
    request({ loading, ..._config } = {}) {
        if (!_adapter) {
            throw new Error('request对象暂未定义，请先初始化！');
        }
        const showLoading = loading !== false;
        const msgHandle = new Handle(showLoading);
        this.setMessage = msgHandle.setMessage.bind(msgHandle);
        const config = merge({}, this.defaultConfig, _config);
        if (config.url?.startsWith('http'))
            config.baseURL = '';
        const request = _adapter.request(config).then((response) => {
            msgHandle.setup(response);
            const { responseType, filename } = config;
            const data = response.data;
            if (responseType === 'blob') {
                // axios blob数据转为url,保持和uniRequest一致
                if (data.size) {
                    return window.URL.createObjectURL(data);
                }
                // if (data instanceof Blob) {
                //   return window.URL.createObjectURL(data)
                // }
            }
            else if (this.interceptorResolve) {
                return this.interceptorResolve(response);
            }
            return response;
        });
        Promise.resolve(request)
            .catch((err) => {
            const code = err?.status || err?.code || -1;
            msgHandle.setup({ ...err, code });
        })
            .then((data) => { });
        return request;
    }
}

// 用户数据缓存
const store = {};
/** 请求并缓存数据 */
function getDataCache(type, request) {
    const cache = store[type];
    if (!cache) {
        return new CacheResult(type, request);
    }
    else if (cache.status === 'ready') {
        cache.load(request);
    }
    return cache;
}
function checkType(item, key = 'id') {
    if (typeof item === 'object') {
        return ('value' in item && 'label' in item) ? 'dict' : key in item ? 'record' : undefined;
    }
}
class CacheResult {
    name;
    _key;
    list = [];
    _map;
    _status = 'ready';
    _dataType;
    promise;
    constructor(name, request, _key) {
        this.name = name;
        this._key = _key;
        store[name] = this;
        this.promise = this.load(request);
    }
    load(request) {
        this._status = 'pending';
        return request().then((data) => {
            this._status = 'loaded';
            this._dataType = checkType(data?.[0]);
            return (this.list = data || []);
        }, () => (this._status = 'ready'));
    }
    get status() {
        return this._status;
    }
    get map() {
        if (!this._map && this._dataType && this.list.length > 0) {
            const map = {};
            for (const item of this.list) {
                if (this._dataType === 'record') {
                    const key = this._key || 'id';
                    if (item[key])
                        map[key] = item;
                }
                else if (this._dataType = 'dict') {
                    const { value, label } = item;
                    map[value] = label;
                }
            }
            this._map = Object.freeze(map);
        }
        return this._map || {};
    }
    get value() {
        return this.list;
    }
    then(callback) {
        this.promise.then(callback);
    }
}

export { Resource as ApiResource, Base as BaseInfo, List as BaseList, Http, createApi, getDataCache, infoExtend, pagesExtend, serviceInit, setApiConfig, setDefRequestConfig, setLoadingServe };
