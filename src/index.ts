/// <reference types="../types" />
/*
 * @Description: api数据模型化生成
 * @Autor: 范阳峰
 */
export { serviceInit, setLoadingServe, setGlobalConfig, defineConfig } from './service'
export * from './dataCache'
/**
 * 标准http请求类
 */
export { default as Http } from './Http'
/**
 * http package 资源类
 */
export { default as ApiResource } from './Resource'

export { buildAdapter } from './mpRequest'
/** 标准 Fetch API 请求适配器 */
export { fetchAdapter } from './fetchAdapter'
