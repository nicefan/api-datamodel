export interface CodegenApiConfig {
  /** Swagger/OpenAPI JSON 地址。 */
  url: string
  /** 覆盖全局生成根目录。 */
  outputDir?: string
  /** src/api 下的输出文件夹；省略时使用当前配置名称。 */
  outputFolder?: string
  /** Resource 类及其请求前缀配置。 */
  resource?: {
    /** Resource 类 TS 文件路径；使用其默认导出生成同目录 resource.ts。省略时使用内置 ApiResource。 */
    importPath?: string
    /** 传给 ApiResource.factory 的 rootPath。 */
    rootPath?: string
    /** rootPath 的来源，指定网关或是接口固定前缀；默认是网关前缀。 */
    rootPathSource?: 'gateway' | 'document'
  }
  /** 接口返回的数据结构配置。 */
  responseSchema?: {
    namePrefix?: string
    dataField?: string
  }
  /** 传递给 swagger-typescript-api 的配置。 */
  generatorOptions?: Record<string, unknown>
  /** 交互选择时显示的说明。 */
  label?: string
}
export interface CodegenConfig extends Omit<CodegenApiConfig, 'url' | 'outputFolder' | 'label'> {
  apis?: Record<string, CodegenApiConfig>
}
declare const config: CodegenConfig
export default config
