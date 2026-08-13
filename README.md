# 数据模型

将数据请求以业务模块分类进行对象封装调用，将接口数据字段以实体类形式管理。

可跨平台共用，提升后端接口数据的可维护性与一致性，使用typeScript智能语法提示，提升开发效率。

# 快速开始

## 安装

```bash
yarn add api-datamodel
```

## 基础配置

```ts
import axios from 'axios'
import { Http, setLoadingServe, defineConfig } from 'api-datamodel'
import { message as showMessage, Modal } from 'ant-design-vue';

const key = '_LOADINGMESSAGE_'
// 配置loading及消息显示
// 以ant-design-vue为例，实现全局请求loading显示及请求返回消息自动提示
setLoadingServe({
  show() {
    // 显示loading的操作
    showMessage.loading({ content: '请求中...', duration: 0, key });
  },
  close(data) {
    const { message, type, code, messageMode } = data;
    // 全部请求结束后关闭loading及显示消息的操作
    // 可以通过code判断进行友好提示
    if (type === 'error' && messageMode === 'modal') {
      Modal.error({
        title: '错误提示',
        content: message,
      });
    } else if (message && message !== 'SUCCESS') {
      showMessage.open({ type, content: message, key, duration: 2.5 });
    } else {
      showMessage.destroy(key);
    }
  },
});

/** 定义配置 */
const commonConfig = defineConfig({
  // 配置请求适配器（必须）
  adapter: axios,
  // 请求服务地址或反向代理前缀
  serverUrl: '/api', 
  // 请求地址前缀，对应不同业务来源
  rootPath: '',
  // 拦截请求返回数据，处理成标准数据格式返回，用于自动消息处理
  transformResponse(resultData) {
    const { code, msg, data } = resultData;
    return {
      code,
      message: msg,
      data,
      success: code === 200,
    };
  },
  // 请求拦截，一般用于设置请求头
  requestInterceptors: (config) => {
  // 请求之前处理config
    return config
  }
  // 默认请求参数
  defRequestConfig: {
    timeout: 30000,
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
  },
})

/** 创建一个请求服务生成方法 */
const createApi = Http.factory({
  ...commonConfig,
  // 覆盖配置
  rootPath: '/system',
});

export { createApi }
```

## 创建api实例

以“user”接口模块为例，创建一个“user”请求资源实例：

```ts
const userApi = createApi('/user', {
    getPageList(param) {// 实际请求地址为"/api/user/page"
        return this.get('page', param, {
          /** 静默请求，不显示loading及消息 */
          silent?: boolean
          /** 后台加载，不显示loading框 */
          backendLoad?: boolean
          /** 错误提示方式 */
          messageMode?: 'modal' | 'message'
          // ...其它请求参数
        }) 
    },
    getInfo(param?: Obj) {
        return this.get('getInfo', param) // 实际请求地址为"/api/user/getInfo"
    }
})

export { userApi }
```

底层请求方法也可通过只读的 `$http` 访问。当业务方法与 `get`、`post`、`delete`、`request` 等基础方法重名时，应使用 `$http` 避免命名冲突：

```ts
const userApi = createApi('/user', {
    delete(id: string, config?: RequestConfig) {
        return this.$http.delete<boolean>(`/delete/${id}`, undefined, config)
    },
    request(id: string) {
        return this.$http.get<User>(`/${id}`)
    },
})

userApi.post('/save', data)       // 原有顶层请求方法仍可使用
userApi.$http.post('/save', data) // 显式调用底层请求方法
userApi.$http.abort()             // 中止该资源所有进行中的请求
```

应用：

```ts
// 发起get请求 '/user/page'
userApi.getPageList().then(data => {
    this.data = data
})
```

## 缓存请求

数据请求进行缓存

```ts
import { createCache } from 'api-datamodel'
  export const getDeptCache = createCache({
    request: deptApi.list, // 指定请求方法,应该是一个静态方法，如果绑定()=>xxx()的动态方法，需加上name属性。
    // name: 'deptApi', // 可忽略，用于缓存唯一签名。
    keyField: 'deptId', // 普通记录生成map时必须明确指定key字段。
    labelField: 'name', // 与keyField同时指定时，将结果转换为字典项。
  });

  // 只需要简单缓存
  export const getDict = createCache(dictApi.list);
  // 使用
  getDict('sex').result
  ```
### 缓存数据格式
`createCache` 生成一个原请求方法的一个代理方法，参数与原方法一致，返回结果为 `CacheResult` 类型对象：
  ```ts
  interface CacheResult<T>{
    /** 重新请求更新缓存 */
    reload(): Promise<SyncData<T>>;
    /** 请求结果数据 */
    result: T | undefined;
    /** 异步获取请求结果 */
    getResult(): Promise<T | undefined>;
    /** 请求结果键值对对象 */
    map: DictMap<T>;
    /** 异步获取请求结果键值对对象 */
    getMap(): Promise<DictMap<T>>;
  }
  ```

## loading及消息提示

### 请求返回数据结构约定 

默认后端接口返回数据结构如下，在高级配置中可以自定义配置。

| 属性 | 说明                  |
| ---- | --------------------- |
| code | 状态码 |
| msg  | 请求提示消息          |
| data | 返回的数据对象        |
| success | 是否请求成功        |

当一个请求列队全部请求完成后，最后一个返回的提示消息将通过调用配置好的 `loadingServe` 的 `close` 方法返回，实现自动的消息提示显示。在 `close` 方法中可以通过 `code` 进行统一的消息处理。

### 消息拦截 `setMessage`

`(property) Http.setMessage: (msgData: string | MessageData) => void`

当某个请求需要替换接口返回的提示或不显示默认提示时，可以使用请求实例的 `setMessage` 方法处理。

```ts
export const userApi = createApi('/user', {
    save(param) {
        return this.post('save', param).then(result => {
            // 替换接口返回消息，为空时不显示消息提示
            this.setMessage('用户已保存！')
            return result
        })
    },
})
```

在业务代码中调用：

``` ts
import { userApi } from '@/api'

userApi
  .save({ ... })
  .then(result => {
    userApi.setMessage('')
  })
```

### loading状态控制

默认情况下发起请求会自动以请求列队的方式， 在请求时长超过200毫秒时实现loading状态显示。当某个请求需静默无感知刷新数据时，可以在请求参数中加上 `silent: true` 。

```ts
export const userApi = createApi('/user', {
    /** 获取用户消息，防止出现加载提示 */
    getNotice(id: string) {
        return this.get('notice', { id }, { silent: true })
    },
})
```


# 高级

## 全局请求类：Http

全局的http请求控制。

**构造方法：**

`Http(config?: RequestConfig)`

可指定默认的请求参数生成一个请求实例。

```ts
const http = new Http()
```

### 静态方法

+ `setAdapter`

  指定一个包含有 `request` 方法的请求适配器，可以通过基础配置的 `serveInit` 方法进行指定。

### 实例方法

+ `setDefault(config: RequestConfig)`

  设置实例默认请求参数，同构造方法

+ `request(config: RequestConfig)`

  合并请求参数，发起请求

+ post(*url*: string, *data*?: Obj, *config*: RequestConfig = {})

  指定请求参数 `method: 'POST'` 调用 `request` 方法发起请求

+ get(*url*: string, *data*?: Obj, *config*: RequestConfig = {})

  指定请求参数 `method: 'GET'` 、`params: data`，调用 `request` 方法发起请求

+ put(*url*: string, *data*?: Obj, *config*: RequestConfig = {})

  指定请求参数 `method: 'PUT'` 调用 `request` 方法发起请求

+ delete(*url*: string, *data*?: Obj, *config*: RequestConfig = {})

  指定请求参数 `method: 'DELETE'` 调用 `request` 方法发起请求

+ setMessage(msg: messageData)

  在 `request` 方法发起请求前进行绑定，只能在请求回调方法中调用

+ 内部方法：interceptorResolve(data: any)

  请求成功后调用的拦截勾子方法，可以通过继承在子类实现

## 业务模块请求类：Resource

Resource类继承自Http类，在Http类的基础上对内部业务请求进行的一层包装，实现对请求方式与返回数据进行统一处理。根据自身业务需要，可以通过继承此类覆盖或补充相关方法来实现灵活的业务处理。

默认的请求成功后的拦截处理，依照接口返回数据结构，将code不为0的结果作 `reject` 返回。

``` js
protected interceptorResolve(response) {
    const { code, msg: message, data } = response.data
    if (code === 0) {
        this.setMessage({ code, message })
        return data
    } else {
        return Promise.reject({ ...response, code, message, setMessage: this.setMessage })
    }
}
```

***构造方法：***

`Resource(name: string, config?: RequestConfig)`

指定请求模块名作为请求前缀，生成一个业务模块的请求实例

### 静态方法/属性

+ create(*name*: string, *methods*?: Obj)

  工厂方法创建一个实例，同时给实例扩展请求方法。

+ factory()

  将create方法绑定构造类，返回一个直接使用的工厂方法。

  ```ts
  export const createApi = Resource.factory()
  // createApi 等同于 Resource.create
  ```

+ rootPath属性

  默认通过基础配置方法 `setApiConfig` 生成，当有多个不同的业务模块分别对应不同的前缀，可在子类中直接指定。

### 实例方法

+ upload(*apiName*: string, *data*: FormData | UniFormData, *config*?: RequestConfig)

  formData表单格式上传文件，请求参数 `headers` 中加入 `'content-type': 'multipart/form-data'`

+ downloadFile(*apiName*: string, *config*?: RequestConfig)

  通过指定请求参数`responseType: 'blob'` 实现二进制流文件下载

