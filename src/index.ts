/// <reference types="../types" />

import Resource from './Resource'
import Http from './Http'
import { setRequestHooks } from './utils/requestManager'

export function defineConfig(options: HttpOptions) {
  return options
}

export function createService(options: HttpOptions) {
  return Resource.createService(options)
}

export { Http, Resource, setRequestHooks }
export { buildAdapter } from './platformAdapter'
export { fetchAdapter } from './fetchAdapter'
export type { Service } from './service'
export type { RequestBatchResult, RequestHooks } from './utils/requestManager'
