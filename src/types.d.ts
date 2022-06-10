
interface Adapter {
  (url:string, config: RequestConfig): Promise<any>
  [key: string]: any
}