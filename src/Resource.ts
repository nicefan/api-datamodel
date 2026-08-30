import Http from './Http'

/** 在标准 Http 上补充可复用的通用请求能力。 */
class Resource extends Http {
  /** formData表单格式上传文件 */
  upload(requestPath: string, data: FormData | UniFormData, config?: RequestConfig) {
    return this.request(requestPath, {
      headers: { 'content-type': 'multipart/form-data' },
      data,
      method: 'POST',
      ...config,
    })
  }

  /** 二进制流文件下载。
   * * 默认取请求头中的filename为文件名，可配置config.filename指定下载文件名(跨平台不支持，需自行在拦截器中配置)
   **/
  downloadFile(requestPath: string, config?: RequestConfig) {
    return this.request<any>(requestPath, {
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
      return { filename, data }
    })
  }
}

export default Resource
