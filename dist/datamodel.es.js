/*!
  * api-datamodel v0.4.0
  * (c) 2023 范阳峰 covien@msn.com
  * @license MIT
  */
import merge from 'lodash/merge';
import cloneDeep from 'lodash/cloneDeep';
import pick from 'lodash/pick';

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __rest(s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
}

var taskStack = (function () {
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
    const start = function (immed = false) {
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
    };
    const complete = function (data) {
        if (data === null || data === void 0 ? void 0 : data.message)
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
    };
    /** 加载完成显示的消息 */
    const showMessage = function (data = msgData) {
        LoadingServe().close(data);
        msgData = undefined;
        state = 'ready';
        clearTimeout(showTimeout);
        clearTimeout(timeout);
    };
    return {
        start,
        complete,
        showMessage,
    };
})();

class Handle {
    constructor(_options = {}) {
        this._options = _options;
        this.isInit = false;
        const { backendLoad, silent, errMessageMode } = _options;
        this._md = { errMessageMode };
        if (!backendLoad && !silent)
            taskStack.start();
    }
    setup(data) {
        if (this._options.silent)
            return;
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
            this._md.message = msgData;
        }
        else {
            this._md = Object.assign(Object.assign({}, this._md), msgData);
        }
    }
    handle() {
        const { code, message, success } = this._orginData;
        let msgData = {};
        if (!success) {
            const _message = this.formatError(code, message);
            msgData = Object.assign(Object.assign(Object.assign({}, this._orginData), { type: 'error', message: _message }), this._md);
        }
        else if (typeof message === 'string') {
            msgData = Object.assign(Object.assign(Object.assign({}, this._orginData), { type: 'success' }), this._md);
        }
        if (!this._options.backendLoad) {
            taskStack.complete(msgData);
        }
        else if (msgData) {
            // 不进行loading加载的请求消息显示
            taskStack.showMessage(msgData);
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

class Http {
    constructor(config) {
        this.requestConfig = {};
        new.target.options = Object.assign(Object.assign({}, defaultOptions), new.target.options);
        config && this.setDefault(config);
    }
    setDefault(config) {
        merge(this.requestConfig, config);
    }
    /** 请求数据消息处理 */
    interceptorResolve(response) {
        const { code, message, data, success } = response.data || {};
        if (code === 'undefined') {
            return response.data;
        }
        else if (success) {
            this.setMessage({ code, message, success });
            return data;
        }
        else {
            return Promise.reject(Object.assign(Object.assign({}, response), { code, message, setMessage: this.setMessage }));
        }
    }
    post(url, data, config = {}) {
        return this.request(url, Object.assign(Object.assign({}, config), { data, method: 'POST' }));
    }
    get(url, data, config = {}) {
        return this.request(url, Object.assign(Object.assign({}, config), { method: 'GET', params: data }));
    }
    put(url, data, config = {}) {
        return this.request(url, Object.assign(Object.assign({}, config), { data, method: 'PUT' }));
    }
    delete(url, data, config = {}) {
        return this.request(url, Object.assign(Object.assign({}, config), { data, method: 'DELETE' }));
    }
    request(url, config = {}) {
        const { adapter, defRequestConfig, requestInterceptors, transformResponse } = this.constructor.options;
        if (!adapter) {
            throw new Error('request对象暂未定义，请先初始化！');
        }
        const _a = merge({}, defRequestConfig, this.requestConfig, config), { backendLoad, silent, errMessageMode, filename } = _a, _config = __rest(_a, ["backendLoad", "silent", "errMessageMode", "filename"]);
        const msgHandle = new Handle({ backendLoad, silent, errMessageMode });
        this.setMessage = msgHandle.setMessage.bind(msgHandle);
        // 全局配置-> 业务配置 -> 实例配置 -> 请求配置 
        // 请求前的请求拦截操作
        const requestConfig = (requestInterceptors === null || requestInterceptors === void 0 ? void 0 : requestInterceptors(_config)) || _config;
        const request = adapter(url, requestConfig).then((response) => {
            msgHandle.setup(response);
            const data = response.data;
            if (requestConfig.responseType === 'blob') {
                // axios blob数据转为url,保持和uniRequest一致
                if (data.size) {
                    return window.URL.createObjectURL(data);
                }
                return data;
            }
            // 返回数据格式化处理
            if (transformResponse) {
                response.data = transformResponse(data);
            }
            return this.interceptorResolve(response);
        });
        Promise.resolve(request)
            .catch((err) => {
            const code = (err === null || err === void 0 ? void 0 : err.status) || (err === null || err === void 0 ? void 0 : err.code) || -1;
            msgHandle.setup(Object.assign(Object.assign({}, err), { code }));
        })
            .then((data) => { });
        return request;
    }
}
Http.options = {};

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
function create(name, methods) {
    const res = new this(name);
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
 * 分页列表类 <参数类型定义>
 */
class List {
    static setInterceptor(func) {
        _interceptor = func;
    }
    /** 集合类型构造器 */
    get _ItemConstructor() {
        return undefined;
    }
    /** 请求方法定义 */
    _requestMethod(arg0) {
        return Promise.reject('request method not found!');
    }
    constructor(param) {
        /** 默认请求参数 */
        this._defaultParam = {};
        /** 保存用户查询参数 */
        this._param = {};
        this.pageParam = {};
        this.records = [];
        /** 当前页 */
        this.current = 1;
        /** 总页数 */
        this.pageCount = 1;
        /** 每页大小 */
        this.pageSize = 10;
        /** 总条数 */
        this.total = 0;
        if (param) {
            this.setDefaultParam(param);
        }
        if (this._ItemConstructor) {
            // 初始化一个实例，保证实例中依赖的缓存数据进行初始加载
            new this._ItemConstructor();
        }
    }
    request() {
        this._status = 'loading';
        const param = Object.assign(Object.assign(Object.assign({}, this._defaultParam), this._param), { page: this.pageParam });
        return this._requestMethod(param).then((result) => {
            return this.update(result);
        });
    }
    get status() {
        return this._status;
    }
    setDefaultParam(_a) {
        var { size } = _a, param = __rest(_a, ["size"]);
        this._defaultParam = Object.assign(Object.assign({}, this._defaultParam), param);
        if (size)
            this.pageParam.size = size;
    }
    /** 查询请求数据 */
    query(param) {
        delete this.pageParam.current;
        this._param = param && Object.assign({}, param);
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
    reload() {
        this.request();
    }
    /** 获取指定页码数据 */
    goPage(page) {
        page = page < 1 ? 1 : page > this.pageCount ? this.pageCount : page;
        this.pageParam.current = page;
        return this.request();
    }
    /** 是否还有下一页 */
    get hasNextPage() {
        return this.current < this.pageCount;
    }
    /** 加载下一页数据  */
    loadMore() {
        if (this.current < this.pageCount) {
            const data = this.records;
            return this.goPage(this.current + 1).then(records => {
                this.records = data.concat(records);
            });
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

class Resource extends Http {
    constructor(name = '', config) {
        super(config);
        /**
         * 业务请求前缀，默认使用全局配置;
         * 通过继承生成自定类时，可以指定该属性实现多服务器请求
         * */
        this.basePath = '';
        const { serverUrl = '', rootPath = '' } = new.target.options;
        this.basePath = serverUrl + (name.startsWith('/') ? name : `${rootPath}/${name}`);
        // this.basePath += this.basePath.endsWith('/') ? '' : '/'
    }
    request(path, config) {
        // 全局配置-> 业务配置 -> 实例配置 -> 请求配置 
        const url = this.basePath + (path && !path.startsWith('/') ? '/' : '') + path;
        return super.request(url, config);
    }
    /** 查询分页列表 */
    // getPageList(param?: Obj) {
    //   return super.post<PagesResult>('page', param)
    // }
    /** formData表单格式上传文件 */
    upload(apiName, data, config) {
        return this.request(apiName, Object.assign({ headers: { 'content-type': 'multipart/form-data' }, data, method: 'POST' }, config));
    }
    /** 二进制流文件下载。
     * * 默认取请求头中的filename为文件名，可配置config.filename指定下载文件名(跨平台不支持，需自行在拦截器中配置)
     **/
    downloadFile(apiName, config) {
        return this.request(apiName, Object.assign({ responseType: 'blob', method: 'POST' }, config));
    }
    /** 创建一个数据实体类 */
    // makeInfoClass<T, R extends Resource>(this:R, Def: Cls<T>) {
    //   return infoExtend(Def, this)
    // }
    /** 创建一个分页列表类 */
    makePagesClass(Info, methodName = 'page') {
        const queryMethod = (param) => this.post(methodName, param);
        return pagesExtend(queryMethod, Info);
    }
    /** 快速创建一个无类型分页数据列表实例 */
    createPagesInstance(defParam, method, Item) {
        const queryMethod = method || this['getPageList'] || ((param) => this.post('page', param));
        return new (pagesExtend(queryMethod.bind(this), Item))(defParam);
    }
}
/** 工厂模式快速创建实例 */
Resource.create = create;
Resource.factory = factory;
Resource.ERROR = new TypeError('Api instance undefined!');

const defaultOptions = {
    defRequestConfig: {
        timeout: 50000
    },
    // transformResponse(resultData) {
    //   const { code, message, data } = resultData
    //   return {
    //     code,
    //     message: message === 'SUCCESS' ? '' : message,
    //     data,
    //     success: code === 0 || code === 200
    //   }
    // }
};
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
 * 设置全局配置
 * @param config -{ adapter, defRequestConfig, loadingServe }
 * @param config.adapter 请求模块 如：axios
 */
function setGlobalConfig(_a) {
    var { loadingServe } = _a, options = __rest(_a, ["loadingServe"]);
    if (loadingServe) {
        setLoadingServe(loadingServe);
    }
    merge(defaultOptions, options);
}
function defineConfig(options) {
    return options;
}
/** 配置全局请求参数，并返回一个服务工厂方法 */
function serviceInit(config) {
    setGlobalConfig(config);
    return Resource.factory();
}
/** 创建一个请求服务 */
function createServer(config) {
    class Server extends Resource {
    }
    Server.options = config;
    return Server;
}

// 用户数据缓存
const store = {};
/** 请求并缓存数据 */
function getDataCache(name, request, keyField) {
    const cache = store[name];
    if (!cache) {
        return (store[name] = new CacheResult(name, request, keyField));
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
    constructor(name, request, _key) {
        this.name = name;
        this._key = _key;
        this.list = [];
        this._status = 'ready';
        this.promise = this.load(request);
    }
    load(request) {
        this._status = 'pending';
        return request().then((data) => {
            this._status = 'loaded';
            this._dataType = checkType(data === null || data === void 0 ? void 0 : data[0]);
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

/** 创建一个基于当前实体类的分页列表类 */
function makePagesClass(method) {
    return pagesExtend(method || this.prototype.res, this);
}
/** 快速创建一个分页数据列表实例 */
function createPages(defParam, method) {
    return this.prototype.res.createPagesInstance(defParam, method, this);
}
class Base {
    /** 实例默认属性值，必须通过子类实现 */
    get defaultProps() { return {}; }
    /** 实例请求操作源，可在子类继承实现 */
    get api() {
        throw Resource.ERROR;
    }
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
        const proto1 = Reflect.getPrototypeOf(this);
        if (proto1) {
            const names = Object.getOwnPropertyNames(proto1);
            for (const key of names) {
                const descriptor = Reflect.getOwnPropertyDescriptor(proto1, key);
                if (descriptor === null || descriptor === void 0 ? void 0 : descriptor.get) {
                    Object.defineProperty(this, key, Object.assign(Object.assign({}, descriptor), { enumerable: true }));
                }
            }
        }
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
        var _a;
        const _data = this.onUpdateBefore(data) || data;
        const _def = cloneDeep(this.defaultProps);
        if (_data) {
            this._data = Object.assign({}, _data);
            for (const key of Object.keys(_def)) {
                this._data[key] = (_a = this._data[key]) !== null && _a !== void 0 ? _a : _def[key];
            }
        }
        else {
            this._data = _def;
        }
    }
    /** 实例构造时传的id,将调用此方法加载数据， */
    load(id) {
        var _a;
        return (_a = this.api) === null || _a === void 0 ? void 0 : _a.get(id).then(result => {
            const data = this.onLoadAfter(result) || result;
            this.reset(data);
            return data;
        });
    }
    /** 克隆实体类 */
    clone() {
        const newItem = Reflect.construct(this.constructor, []);
        newItem._data = cloneDeep(this._data);
        for (const key of Object.keys(this)) {
            if (!Reflect.has(this.defaultProps, key)) {
                const descriptor = Reflect.getOwnPropertyDescriptor(this, key);
                if (descriptor === null || descriptor === void 0 ? void 0 : descriptor.writable) {
                    newItem[key] = cloneDeep(Reflect.get(this, key));
                }
            }
        }
        return newItem;
    }
    /** 合并内容 */
    assign(data) {
        this.reset(Object.assign(Object.assign({}, this._data), data));
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
Base.extend = extend;
Base.createFactory = BaseFactory;
Base.makePagesClass = makePagesClass;
Base.createPages = createPages;
function extend(DefaultData, res) {
    const _defaultData = new DefaultData();
    const _res = typeof res === 'string' ? new Resource(res) : res;
    const _Super = (this && Object.getPrototypeOf(this) === Base) ? this : Base;
    class _Info extends _Super {
        get defaultProps() {
            return _defaultData;
        }
        get api() {
            const res = _res || super.api;
            if (!res)
                throw Resource.ERROR;
            return res;
        }
    }
    _Info.api = _res;
    return _Info;
    // return decorator(Info, _defaultData)
}
function BaseFactory() {
    return extend.bind(this);
}
const infoExtend = Base.createFactory();

/*
 * @Description: taro、uni移动端跨平台请求方式适配
 * @Autor: 范阳峰
 * @Date: 2020-07-06 16:12:02
 * @LastEditors: 范阳峰
 * @LastEditTime: 2021-08-17 18:34:34
 */
function buildAdapter(frame) {
    function request(url, _a) {
        var { params = {}, data = params, headers = {} } = _a, config = __rest(_a, ["params", "data", "headers"]);
        const { 'content-type': type } = headers, _header = __rest(headers, ['content-type']);
        if (data.filePath && type === 'multipart/form-data') {
            return _upload(url, data, _header);
        }
        if (config.responseType === 'blob') {
            return _download(url, headers);
            // return fetch(new Request(baseURL + url, { headers }))
            // .then(response => response.blob())
        }
        return new Promise((resolve, reject) => {
            frame.request(Object.assign(Object.assign({ url,
                data, header: headers }, config), { 
                // success: resolve,
                fail(err) {
                    reject(err);
                },
                success(res) {
                    const code = res.statusCode;
                    if (code === 200) {
                        resolve(res);
                    }
                    else {
                        let err;
                        if (code === 426 && res.header.verifyfailurenum) {
                            err = { code, message: res.data.msg, verifyfailurenum: res.header.verifyfailurenum };
                        }
                        else {
                            err = { code, message: typeof res.data === 'string' ? res.data : res.data.msg || res.data.message };
                        }
                        reject(err);
                    }
                },
                complete(res) {
                    // console.log(`${baseURL + url}`, res)
                } }));
        });
    }
    function _upload(url, _a = {}, header) {
        var { filePath, fileKey } = _a, formData = __rest(_a, ["filePath", "fileKey"]);
        return new Promise((resolve, reject) => {
            frame.uploadFile({
                url,
                filePath,
                name: fileKey,
                formData,
                header,
                fail(err) {
                    // console.log('uploadErr:' + url + err)
                    resolve(err);
                },
                success(res) {
                    const { statusCode: code, data } = res;
                    if (code === 200) {
                        resolve({ code, data: JSON.parse(data) });
                    }
                    else {
                        reject({ code, message: res.data });
                    }
                },
            });
        });
    }
    /** 发起一个 HTTP GET 请求，返回文件的本地临时路径 */
    function _download(url, header) {
        return new Promise((resolve, reject) => {
            frame.downloadFile({
                url,
                header,
                success({ tempFilePath, statusCode: code, data }) {
                    if (code === 200) {
                        resolve({ code, data: tempFilePath });
                    }
                    else {
                        reject({ code, message: data });
                    }
                },
                fail(err) {
                    // console.log('downLoadErr:' + url + err)
                    resolve(err);
                },
            });
        });
    }
    return request;
}

export { Resource as ApiResource, Base as BaseInfo, List as BaseList, Http, buildAdapter, createServer, defineConfig, getDataCache, infoExtend, pagesExtend, serviceInit, setGlobalConfig, setLoadingServe };
