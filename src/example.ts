/* eslint-disable @typescript-eslint/no-unused-vars */
import Resource from './Resource';
import BaseInfo, { infoExtend } from './BaseInfo'
import { pagesExtend} from './BaseList'
import { getCipherInfo } from 'crypto';

const res = Resource.create('user', {
  getList: 'get',
  getPageList() {
    return this.getList<PagesResult>() //as Promise<PagesResult>
  },
  getInfo() {
    return this.post<Record<string, any>>('info')
  }
})

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
const dc = Info.createPages()
/** 别名infoFactory等同于BaseInfo.extend */
class InfoEx2 extends infoExtend(Def, res) {}
/** 快速创建，不需要扩展 */
const InfoEx = infoExtend(Def, res)
// const info = new Info()
// info.age=20

/** 直接通过请求路径创建，无需另外创建Resource */
class User extends infoExtend(Def, 'user') {
  test() {
    this.api.delete('id')
  }
}
class SubUser<Resource extends Obj> extends BaseInfo<Resource> {
  newfunc() {

  }
}
const subFactory = SubUser.createFactory()

class SSubUser extends subFactory(class { }) {
  test() {
    this.newfunc
    this.api.delete
  }
}
const subUser = new (SubUser.extend(Def))()
const ssubUser = new SSubUser()
subUser.newfunc
const user = new User()
user.realName = 'joe'

/** res创建, 省略一个参数（推荐）
 * res.makeInfoClass(Def) 等同于 infoExtend(Def, res)
 */
class InfoRes extends infoExtend(Def, res) {
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
class Pagess extends pagesExtend(res, Info) { }
const ax = new Pagess()


/** 快速创建，不需要扩展 */
const PagesEx = pagesExtend<QueryParam, Info>(res, Info)
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
const PagesInfo2 = Info.makePagesClass<QueryParam, Info>(res.getPageList)

/** 不使用实体 */
const PagesSl = pagesExtend<QueryParam>(res)

/** 工厂方法创建实例 */
function createPages(defParam: Obj) {
  return new (pagesExtend(res.getPageList, Info))(defParam)
}

// 可在业务中直接使用，如需要定义查询条件类型或查询方法，需要再写个包装方法
const pages2Info = Info.createPages()
const pages2Res = res.createPagesInstance()
function getPages(defParam: Obj) {
  return Info.createPages<QueryParam, Info>(defParam, res.getPageList)
}
