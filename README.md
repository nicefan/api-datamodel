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
    const { message, type, code, errMessageMode } = data;
    // 全部请求结束后关闭loading及显示消息的操作
    // 可以通过code判断进行友好提示
    if (type === 'error' && errMessageMode === 'modal') {
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
          errMessageMode?: 'modal' | 'message'
          // ...其它请求参数
        }) 
    },
    getInfo(param?: Obj) {
        return this.get('getInfo', param) // 实际请求地址为"/api/user/getInfo"
    }
    // 上面方法使用快捷语法糖实现
    getInfo: 'get', 
})

export { userApi }
```

应用：

```ts
// 发起get请求 '/user/page'
userApi.getPageList().then(data => {
    this.data = data
})
```

## 缓存请求

将字典类的数据请求进行缓存

```ts
import { createApi, getDataCache } from 'api-datamodel'
const publicApi = createApi('/public', {
    // 配置一个根据字典名称获取字典的方法
    getDict(name: string) {
        return getDataCache(name, () => this.get('dict/'+ name))
    },
})

```

`getDataCache` 方法返回 `CacheResult` 类型对象：

| 属性    | 类型     | 说明                                                         |
| ------- | -------- | ------------------------------------------------------------ |
| status  | 只读属性 | 状态：`"pending" | "ready" | "loaded" `                      |
| list    | 数组     | 数据请求完成异步进行填充                                     |
| map     | 只读对象 | 根据返回数据识别生成value/label键值对，或以id为key的对象，可以通过第三个参数指定key字段 |
| then    | 方法     | 传递回调方法获取原始返回数据                                 |
| promise | 对象     | 请求生成的promise对象，可用于错误处理                        |

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
        return this.get('notice', { id }, { slient: true })
    },
})
```


## 分页数据模型

使用分页数据模型在业务中进行快捷的请求查询、分页控制等操作。

**创建分页数据实例：**

使用api实例的 `createPagesInstance` 方法创建

```ts

// 通过api实例快捷创建分页实例, 默认调用api实例的getPageList方法用于分页数据请求
function createUserPage(param?: Obj) {
    return userApi.createPagesInstance(param)
}

```

​	一个api实例中有多个分页数据时， 在api实例中扩展

```ts
import { createApi } from 'api-datamodel'
const userApi = createApi('/user', {
    getPageList(param) {
        return this.get('page', param)
    },
    // 添加一个`/user/otherList`接口的请求方法
    getOtherPage(param?: Obj) {
        return this.get('otherList', param)
    },
    // 指定getOtherPage作为分页请求方法
    createOtherPage(param?: Obj) {
    	return this.createPagesInstance(param, this.getOtherPage)
	}
})
export { userApi }
```




**自定义数据结构处理**

当现有业务接口不符合此约定时，可配置拦截勾子进行转换处理。

[参考setInterceptor](#setInterceptor)

## 实体类数据模型

实体类数据通过描述一个模块的主体数据的基本属性作为核心生成对应实例进行操作。

实体类中包括有该实体的字段属性类型，针对实例的操作方法（增、删、改等），以及需要计算或转换的只读属性。

**创建实体类**

```ts
import { createApi, infoExtend } from 'api-datamodel'

const userApi = createApi('/user', {
    setStatus(id:string, status:string) {
        return this.put(id, {status})
    }
})

// 定义用户字段属性类及默认值
class UserInfo {
  id = ''
  /** 姓名 */
  name = ''
  /** 性别 */
  sex = '2'
  /** 手机号码 */
  mobile = ''
  /** 状态 */
  status = '0'
}

// 将UserInfo包装成一个User实体类
export class User extends infoExtend(UserInfo, userApi) {
    // 只读属性
    get sexName() {
        return ['先生', '女士'][this.sex-1]
    }
    
    /** 设为在职 */
  	setOnline() {
    	const status = '1'
    	return this.api.setStatus(this.id, status).then(() => {
      		this.status = status
      	})
  	}
}
```

业务中使用：

``` vue
<template>
	<div>
        hello, {{ user.name }} {{user.sexName}}
    </div>
</template>
<script>
	import { User } from '@/api'
    export default {
        data() {
            return {
                user: new User() // 构造一个用户实例
            }
        },
        mounted() {
            // 通过用户id加载数据
            this.user.load(this.$route.params.id)
        }
    }
</script>
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

+ makeInfoClass

  生成一个绑定当前请求资源实例的数据实体类

+ makePagesClass

  生成一个绑定有当前请求资源实例的分页列表类

+ createPagesInstance(*defParam*?: Obj, *method* = this.getPageList)

  指定默认的查询条件与查询方法生成一个分页列表实例

## 业务实体类：BaseInfo (抽象类)

BaseInfo类是实体构造类的基类，必须通过 `extend` 静态方法补充实体字段属性和请求资源实例后返回一个具体类，再进行继承使用。

可以通过继承该类，添加通用方法，如保存、删除等。

### 静态方法

+ extend( *Info*: Cls, *res*?: R | string)

  基类扩展方法，将参数Info字段属性混入，同时绑定api属性为第二个参数指定的请求资源实例；

  第二个参数为string类型时，自动创建一个以参数值为前缀的请求资源实例；

  第二个参数忽略时，无法调用默认load方法，需自行在子类中覆盖实现。

+ createFactory()

  生成一个绑定当前构造器的扩展方法，方便独立引入使用

  ```ts
  const infoExtend = BaseInfo.createFactory()
  // infoExtend(...) 等同于 BaseInfo.extend(...)
  ```

+ makePagesClass(*method*?: Fn<Promise<PagesResult>>)

  生成一个绑定当前实例的分页类，等同于`pagesExtend` 方法

+ createPages(*defParam*?: Obj, *method*?: Fn<Promise<PagesResult>>)

  创建一个records记录为当前实体类型的分页实例， 等同于`createOagesInstance` 方法

+ api 

  扩展方法中传递的请求资源实例

### 实例方法

+ reset(data?: any)

  数据重置更新。

+ load(id: string)

  通过调用api资源实例的`get`方法，请求成功后调用`reset`方法更新。

  确保接口模块中提供此接口，如“/user/{id}”，如不一致时，需在子类中覆盖重写此方法。

+ clone()

  克隆一个副本；

+ assign(data: any)

  将新的数据与现有数据整合；

+ getOriginal()

  获取接口返回的原始数据；

+ getObject()

  获取基础属性的标准对象；

+ *protected* init(data?: any)

  内部勾子方法，在构造实例时调用。

+ *protected* onLoadAfter(data: any)

  内部勾子方法，在请求到数据，更新实例前调用。

+ *protected* onUpdateBefore(data: any)

  内部勾子方法，更新实例数据前调用。

## 分页列表类：BaseList (抽象类)

将分页列表请求的查询、分页控制等操作进行封装处理。

### 静态方法 <a name="setInterceptor" />

+  setInterceptor( callback() => Promise )

  配置一个请求拦截器，发起请求前先调用callback ，并将请求方法及请求参数做为callback的执行参数，并要求返回一个符合[请求数据结构约定](#请求数据结构约定)的Promise对象。 在callback方法中可将参数及返回结果数据结构进行处理。
  
  ```ts 
  import { BaseList } from 'api-datamodel'
  BaseList.setInterceptor((fn, param) =>
    fn(param).then(({ current, pages: pageCount, size: pageSize, total, records }) => {
      return { current, pageCount, pageSize, total, records }
    })
  )
  ```

### 实例属性

| 属性名      | 类型                                   | 说明               |
| ----------- | -------------------------------------- | ------------------ |
| records     | array                                  | 当前数据记录数组   |
| current     | number                                 | 当前页             |
| pageCount   | number                                 | 总页数             |
| pageSize    | number                                 | 每页大小           |
| total       | number                                 | 总记录数           |
| status      | "loading"\|"more"\|"noMore"\|undefined | 加载中/更多/最末页 |
| hasNextPage | boolean                                | 是否还有下一页     |

### 实例方法

+ setDefaultParam({ size, ...param}) : void

  指定默认的查询条件参数及分页大小

+ query(param: Obj) : Promise<PagesResult>

  执行查询请求，查询条件将与默认条件合并，并清除当前页码

+ update(data: PagesResult) : data

  在请求成功后将调用此方法对实例属性进行更新，当扩展一些固定的查询条件作为方法时可手动调用些方法更新

+ setSize(size: number) : Promise<PagesResult>

  动态变更每页记录数，将根据总页数重新计算当前页并执行查询

+ reload() : Promise<PagesResult>

  使用当前查询条件，重新执行查询，刷新当前数据

+ goPage(page: number) : Promise<PagesResult>

  跳转到指定页

+ loadMore() : Promise<PagesResult>

  移动端加载更新，通过判断是否还有下一页，执行下一页查询，并将records数组进行拼接。

### 请求数据结构约定

默认后端接口返回的 `data` 数据对象结构定义为 `PagesResult` 类型：

| 属性      | 说明         |
| --------- | ------------ |
| records   | 查询结果数据 |
| current   | 当前页码     |
| total     | 总记录条数   |
| pageCount | 总页数       |
| pageSize  | 每页记录条数 |

**分页查询参数**

​		请求参数中的分页参数使用 `page` 对象传递：

```ts 
page: { current?: number; size?: number } = {}
```

### 生成具体类： pagesExtend

BaseList类需要通过 `pagesExtend` 方法指定一个请求方法才能具体化。

**语法：**

`pagesExtend(res: Obj | Fn<Promise<any>>, Info?: Cls<I>)`

**参数：**

res: 指定数据请求方法或指定一个api实例对象，默认调用api实例中的 `getPageList` 方法做为请求方法；

Info: 指定数据实体类， 将records中的每条数据都转换成一个实体对象。

 ```ts
 import { pagesExtend } from 'api-datamodel'
 const userApi = createApi('/user', {
     getPageList(param) {
         return this.get('page', param)
     },
 })
 class UserPages extends pagesExtend(userApi) {
      /** 导出当前查询记录 */
   	export(filename?: string) {
     	return userApi.downloadFile('export', { data: { ...this._defaultParam, ...this._param }, filename })
   	}
 }
 export { UserPages }
 // 使用new创建实例
 const userPages = new UserPages()
 ```

### 快捷实现

通常业务中可以通过请求实例，或实体类快捷创建分页列表实例。

+ 使用请求实例创建

  ```ts
  import { createApi } from 'api-datamodel'
  const userApi = createApi('/user', {
      getPageList(param) {
          return this.get('page', param)
      },
  })
  export { userApi }
  // 直接使用请求实例创建分页实例
  const userPages = userApi.createPagesInstance()
  // userPages.query()
  ```

+ 使用实体类创建

  ```ts
  class UserInfo {
      // user属性
  }
  export class User extends infoExtend(UserInfo, userApi) {
      
  }
  // 创建一个以User实例的分页列表
  const userPages = User.createPages()
  ```

  