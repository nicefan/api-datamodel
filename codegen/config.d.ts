export interface CodegenApiConfig {
  /** Swagger/OpenAPI 的远程地址或本地 JSON 文件路径。 */
  url: string
  /** 覆盖全局生成根目录。 */
  outputDir?: string
  /** src/api 下的输出文件夹；省略时使用当前配置名称。 */
  outputFolder?: string
  /** 工厂方法或 Service 的默认导入、单成员具名导入语句。 */
  importStatement?: string
  /** 存在时将导入项作为 Service，并通过 basePath 派生工厂方法。 */
  service?: {
    /** 通过 service.with({ basePath }) 创建派生 Service。 */
    basePath: string
    /** 提取模块信息前是否排除文档路径中的 basePath。 */
    pathInDocument?: boolean
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
