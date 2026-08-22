import type { CodegenConfig } from './config'

export type { CodegenApiConfig, CodegenConfig } from './config'

export default function defineConfig<T extends CodegenConfig>(config: T): T
