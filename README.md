# 数据模型 Data-model

请求源：将 api 按模块区分封装成对象，并以方法的形式进行相关接口操作！

实体类：将增、删、改等与单个数据相关的操作封装成实体类，数据变化及相关接口操作都在实例对象中完成

分页集合类：将分页列表查询的相关操作、状态及数据集进行统一管理；

## 一、请求源 Resrouce

请求源是将一个模块 api 打包成一个请求实例，包括增删改查等相关的请求方法。

以用户管理模块为例，接口地址为：“http://192.168.1.11:8080/api/user”

- 服务器地址配置: "http://192.168.1.11:8080"

- 请求前缀配置: “/api"

- 模块名: ”/user"

### 创建源

基本操作

```js
import Resource from '../../server/Resource'
const res = new Resource('/user')
export default res
```

工厂方法

```js
import Resource from '../../server/Resource'

const res = Resource.create('/user', {
  // ... 扩展方法
})
```

### 属性与方法

- #### `upload`

  formData 表单格式上传文件

  > upload(apiName: string, data: FormData | UniFormData, config?: RequestConfig): Promise<any>

- ##### `downloadFile`

  > downloadFile(apiName: string, param?: any, config?: RequestConfig): Promise<any>

  POST 二进制流文件下载。返回 ObjectUrl

  - 默认取请求头中的 filename 为文件名，可配置 config.filename 指定下载文件名

- `getFile`

  > getFile(apiName: string, param?: Obj<any>, filename?: string): Promise<any>

  GET 方式文件下载

- `getPageList`

  > getPageList(param?: Obj<any>): Promise<PagesResult>

  查询分页列表，接口约定的 page 请求接口

- `createPagesModel`

  > createPagesModel<Param = Obj<any>, T = Obj<any>>(defParam?: Obj<any>, method?: (_param_?: Obj<any>) => Promise<PagesResult>, Item?: Cls<T>): FastPages<...>

  ​ 快速创建一个无类型分页数据列表实例

  ​ 使用默认的 getPageList 方法创建一个 Pages 分页列表对象实例

  ​ **参数**

  - defParam: 默认的查询条件
  - method: 一个返回 PagesResult 类型的请求方法
  - item: 指定列表子集的构造函数

- `makePagesClass`

  > ```js
  > makePagesClass<T, Qu = Obj<any>>(Info: Cls<T>, methodName?: string): typeof Pages
  > ```

  通过指定子集构造函数及请求方法名，生成一个分页列表类

  **参数**

      	+ Info: 子集的构造函数
      	+ methodName: 请求方法名，默认“page”

**继承自 Http 实例方法**

- `setDefault`

  设置默认请求参数

- `post, get, put, delete`

  四种数据请求方式

  > post|get|put|delete(url: string, data?: Obj<any>, config?: RequestConfig): Promise<any>

  config 参数中增加了“loading”属性，用于控制本次请求是否自动加载 LOADING 提示

- `setMessage`

  > setMessage: (_msgData_: string | MessageData) => void

  请求返回后可用于拦截变更消息提示

## 二、信息实体类

通过定义的属性描述，扩展操作方法，数据变化都在实例中实现。

用于在 UI 层快捷绑定数据，及增删改等操作。

> 内置的 load, save, delete 方法默认调用绑定的请求资源中的方法实现，如未绑定需要在子类中覆盖重写，否则抛出错误。

### 构建

- 先定义一个基本属性及默认值

  ```js
  class Def {
    id = ''
    realName = ''
    age = 0
    area = ''
  }
  ```

- 通过基类继承扩展

  ```js
  class UserInfo extends BaseInfo.extend(Def) {
    async load(id: string) {
      // 重写load方法实现通过Id装载数据
      const result = await res.get(id)
      this.reset(result)
    }
  }
  ```

- 绑定请求源继承

  ```js
  class UserInfo extends res.makeInfoClass(Def) {
    get title() {
      return this.realName + this.area
    }
  }
  ```

* 初始化实例

  ```js
  // 生成空实例
  const info = new UserInfo()
  // 将已有数据包装成实例对象
  const info = new UserInfo(data)
  // 通过指定Id,异步请求获取数据
  const info = new UserInfo('5a04c73094d5575f5e70e1e9e89b1f42')
  ```

### 继承方法

- onUpdateBefore

  > ```js
  > onUpdateBefore(data?: any): void
  > ```

  数据更新前执行，数据更新前的勾子函数，可对数据进行处理后再写入实例。  

- onLoadAfter

  > ```js
  > onLoadAfter(data: T): T | void
  > ```

  数据异步获取后执行，可对数据进行处理后再进行数据更新

- `reset`

  > ```js
  > reset(data?: any): void
  > ```

  数据重置更新, 更新前会调用`onUpdateBefore`方法

- load

  > ```js
  > load(id: string): Promise<any>
  > ```

  调用`res.getInfo(id)`，将数据更新到实例，promise 中返回原始数据

- `delete`

  > ```js
  > delete(): Promise<any>
  > ```

  调用`res.delete(id)`从数据库删除该记录

- `save`

  > ```js
  > save(): Promise<any>
  > ```

  调用`res.save()`将当前实例的 json 对象进行保存

- `clone`

  > ```js
  > clone(): any
  > ```

  返回一个当前实例的副本

- `assign`

  > ```js
  > assign(data: Obj): void
  > ```

  合并指定内容

- `getOriginal`

  > ```js
  > getOriginal(): Obj<any>
  > ```

  返回初始化实例的原始数据副本

* `getObject`

  > ```js
  > getObject(): Object
  > ```

  返回只包含基本属性的 JSON 对象

## 三、分页列表类

用于数据列表操作绑定

### 创建一个实例

```js
// 默认调用res.getPageList实现数据请求
const pages = res.createPagesModel()
```

```js
// 指定数据请求方法
import { FastPages } from './BaseList'


const getTodoPages = () =>　new FastPages(res.getTodoList)
  // 指定集合数据实体类型
const getTodoPages = () => new FastPages(res.getTodoList, Todo)
}
```

### 扩展类

通过`makePagesClass`生成一个扩展类, `UserInfo`是指定集合中的实体类型

```js
class UserPage extends res.makePagesClass(UserInfo) {
  // 扩展列表操作的一些方法
}

const pagesRes = new PagesRes()
```

### 结合 Resource 快捷实现

```js
const userRes = Resource.create('/user', {
    getPageList(parm) {
        return this.get('page', param)
    }
    todoList(param) {
        return this.get('todo',param)
    }
	/** 用户分页列表实例 */
	createPages() {
        return this.createPagesModel()
    }
    /** 创建一个用户任务分页实例 */
    createTodoPages(param) {
    	return this.createPagesModel(param, this.todoList)
	}
})
export default userRes
```

### 属性

| 名称        | 类型    | 描述                                  | 默认值 |
| ----------- | ------- | ------------------------------------- | ------ |
| records     | array   | 记录集                                | []     |
| current     | number  | 当前页码                              | 1      |
| totalPage   | number  | 总页数                                | 1      |
| size        | number  | 每页大小                              | 10     |
| total       | number  | 总条数                                | 0      |
| status      | string  | 状态：'more' \| 'noMore' \| 'loading' |        |
| hasNextPage | boolean | 是否还有下一页                        | false  |

### 方法

- `setDefaultParam`

  > setDefaultParam( {size?: number} & P): void

  设置当前实例的默认查询条件，及分页大小。

- setSize

  > setSize(size: number): Promise<T[]>

  设置每页条数, 重新计算当前页码并查询

- `query`

  > ```js
  > query(param?: P): Promise<T[]>
  > ```

  查询请求数据，参数为查询条件，将会与默认查询条件合并。

- `reload`

  > ```typescript
  > reload(): void
  > ```

  重新请求当前页，刷新当前数据，

- `goPage`

  > ```js
  > goPage(page: number): Promise<T[]>
  > ```

  获取指定页码数据

- `loadMore`

  ```js
  loadMore(): Promise<undefined>
  ```

  加载下一页数据

### 应用

ui 层应用实例数据绑定

```html
<template>
  <div>
      关键字<input></input>
      <ul>
        <li v-for="item of pages.recoreds" :key="item.id">
            <div>姓名： {{item.name}}</div>
        </li>
      </ul>
      <button v-if="pages.hasNextPage" @click="()=>pages.loadmore()">
          加载更多
      </button>
  </div>
</template>
<script>
  import userRes from 'portal-modal'

  export default {
      data() {
          const { vcusId, vcusName } = this.$store.state.userInfo
          return {
              vcusId,
              vcusName,
              pages: userRes.createPages(),
              search: {
                  key:''
              }
          }
      },
      created() {
        this.pages.setDefaultParam({ companyId: this.vcusId })
    	this.pages.query()
      },
      methods() {
          loadMore() {
              this.pages.loadMore()
          },
          goSearch() {
              this.pages.query(this.search)
          }
          reload() {
              this.pages.reload()
          }
          sizePage(size) {
              this.pages.pageSize(size)
          }
      }
  }
</script>

```

> 完整使用实例参考 example.ts
