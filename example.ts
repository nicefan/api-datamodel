/* eslint-disable @typescript-eslint/no-unused-vars */
import Resource from './lib/Resource'
import BaseInfo, { infoFactory } from './lib/BaseInfo'
import { pagesFactory } from './lib/BaseList'

const res = new Resource('user')

class Def {
  id = ''
  realName = ''
  age = 0
  area = ''
}

/** 标准方式，在扩展类上进行继承 */
class Info extends BaseInfo.extend(Def, res) {
  // 其它属性方法
}
/** 别名infoFactory等同于BaseInfo.extend */
class InfoEx2 extends infoFactory(Def, res) {}
/** 快速创建，不需要扩展 */
const InfoEx = infoFactory(Def, res)
// const info = new Info()
// info.age=20

/** 直接通过请求路径创建，无需另外创建Resource */
class User extends infoFactory(Def, 'user') {}
const user = new User()
user.realName = 'joe'

/** res创建, 省略一个参数（推荐） */
class InfoRes extends res.makeInfoClass(Def) {
  get title() {
    return this.realName + this.area
  }
}
const infoRes = new InfoRes()
infoRes.realName = 'Joe'

/* ===== Pages类 ==== */

interface QueryParam {
  /** 关键字 */
  keywords?: string
  /** 状态 */
  status: string
}

/** 继承扩展类 */
class Pagess extends pagesFactory(res, Info) { }
const ax = new Pagess()


/** 快速创建，不需要扩展 */
const PagesEx = pagesFactory<QueryParam, Info>(res, Info)
const page = new PagesEx()
page.query({ status: '2' })

/** res创建, 指定POST查询接口path, 默认'page' */
class PagesRes extends res.makePagesClass(Info) {}
const PagesRes1 = res.makePagesClass<Info, QueryParam>(Info, 'list')
const pagesRes1 = new PagesRes()
pagesRes1.query({ status: '1' })

/** res创建，不指定查询条件类型 */
const PagesRes2 = res.makePagesClass(Info)

/** 实体类创建，不指定查询条件类型时，可省略<> */
const PagesInfo = Info.makePagesClass()
const PagesInfo2 = Info.makePagesClass<QueryParam, Info>(res.getList)

/** 不使用实体 */
const PagesSl = pagesFactory<QueryParam>(res)

/** 工厂方法创建实例 */
function createPages(defParam: Obj) {
  return new (pagesFactory(res.getPageList, Info))(defParam)
}

// 可在业务中直接使用，如需要定义查询条件类型或查询方法，需要再写个包装方法
const pages2Info = Info.createPages()
const pages2Res = res.createPagesInstance()
function getPages(defParam: Obj) {
  return Info.createPages<QueryParam, Info>(defParam, res.getList)
}
