/*
 * @Description: api数据模型化生成
 * @Autor: 范阳峰
 */

/**
 * 标准http请求类
 */
export { default as Http } from './Http'
/**
 * http package 资源类
 * createRes 工厂方法等同于 Resource.create
 */
export { default as ApiResource, createApi } from './Resource'
/**
 * 实体类
 */
export { default as BaseInfo, infoExtend } from './BaseInfo'
/**
 * 分页类
 */
export { default as BaseList, pagesExtend } from './BaseList'

export { serviceInit, setDefRequestConfig, setLoadingServe, setApiConfig } from './service'
export { getDataCache } from './dataCache'