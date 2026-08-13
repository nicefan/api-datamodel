export interface SwaggerApiConfig {
  /** Swagger/OpenAPI JSON 地址。 */
  url: string
  /** src/api 下的输出文件夹；省略时使用当前配置名称。 */
  folder?: string
  /** 传给 createApi 的业务路径前缀。 */
  prePath?: string
  /** 使用内置模板名称，或相对于业务项目根目录的自定义模板路径。 */
  template?: 'modular' | 'lowcode' | string
  /** 覆盖全局生成根目录。 */
  output?: string
  /** 生成代码中 createApi 的导入路径。 */
  httpPath?: string
  /** 生成代码中使用的请求实例工厂名称。 */
  httpModule?: string
  /** 传递给 swagger-typescript-api 的配置。 */
  generator?: Record<string, unknown> & {
    fileNames?: Record<string, unknown>
  }
  /** 交互选择时显示的说明。 */
  description?: string
}

export interface ApiDatamodelConfig
  extends Omit<SwaggerApiConfig, 'url' | 'folder' | 'prePath' | 'description'> {
  apis?: Record<string, SwaggerApiConfig>
}

declare const config: ApiDatamodelConfig
export default config
