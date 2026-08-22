import Http from './Http'

class Resource extends Http {
  /** formData表单格式上传文件 */
  upload(apiName: string, data: FormData | UniFormData, config?: RequestConfig) {
    return this.request(apiName, {
      headers: { 'content-type': 'multipart/form-data' },
      data,
      method: 'POST',
      ...config,
    })
  }

  /** 二进制流文件下载。
   * * 默认取请求头中的filename为文件名，可配置config.filename指定下载文件名(跨平台不支持，需自行在拦截器中配置)
   **/
  downloadFile(apiName: string, config?: RequestConfig) {
    return this.request(apiName, {
      responseType: 'blob',
      method: 'GET',
      ...config,
    }).then(({ data, headers }) => {
      const disposition = headers?.['content-disposition'] || headers?.['Content-Disposition'] || ''
      const pattern = /filename\*?=(?:UTF-8'')?(?:"([^"]+)"|([^;]+))/i
      const match = disposition.match(pattern)

      let filename = (match?.[1] || match?.[2])?.trim()
      if (filename) {
        try {
          filename = decodeURIComponent(filename)
        } catch {
          // 解码失败，保持原始值
        }
      }
      // uniRequest中data直接返回ObjectURL
      return {
        filename,
        data,
      }
    })
  }
}

export default Resource
