/*
 * @Description: api数据模型化生成
 * @Autor: 范阳峰
 */

export { serviceInit, setLoadingServe, createServer, setGlobalConfig, defineConfig } from './service'
export { getDataCache } from './dataCache'
/**
 * 标准http请求类
 */
export { default as Http } from './Http'
/**
 * http package 资源类
 */
export { default as ApiResource } from './Resource'
/**
 * 实体类
 */
export { default as BaseInfo, infoExtend } from './BaseInfo'
/**
 * 分页类
 */
export { default as BaseList, pagesExtend } from './BaseList'

export { buildAdapter } from './mpRequest'