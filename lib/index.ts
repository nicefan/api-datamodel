/**
 * 标准http请求类
 */
export { default as Http } from './Http'
/**
 * http package 资源类
 * createRes 工厂方法等同于 Resource.create
 */
export { default as Resource, createRes } from './Resource'
/**
 * 实体类
 */
export { default as BaseInfo, infoFactory } from './BaseInfo'
/**
 * 分页类
 */
export { default as BaseList, pagesFactory } from './BaseList'

export { serviceInit, setDefRequestConfig, setLoadingServe, setApiConfig } from './service'