export interface CodegenApiConfig {
  /** Swagger/OpenAPI 的远程地址或本地 JSON/YAML 文件路径。 */
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
  generatorOptions?: Record<string, unknown> & {
    /** 自定义模板目录，相对路径以项目目录为基准。 */
    templates?: string
  }
  /** 获取远程文档时使用的请求配置。 */
  documentRequest?: {
    /** 请求超时毫秒数，默认 30000。 */
    timeout?: number
    /** 请求头，例如鉴权信息。 */
    headers?: Record<string, string>
  }
  /**
   * 重名方法处理策略，默认 `strip`。
   * - `strip`：去除自动追加的数字后缀，打印冲突错误并继续生成。
   * - `keep-suffix`：冲突方法保留数字后缀，打印警告并继续生成。
   * - `error`：发现冲突后终止生成，保留原输出目录。
   */
  duplicateMethodStrategy?: 'strip' | 'keep-suffix' | 'error'
  /** 交互选择时显示的说明。 */
  label?: string
}
export interface CodegenConfig extends Omit<CodegenApiConfig, 'url' | 'outputFolder' | 'label'> {
  apis?: Record<string, CodegenApiConfig>
}
declare const config: CodegenConfig
export default config
