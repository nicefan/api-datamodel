/*
 * @Description: taro、uni移动端跨平台请求方式适配
 * @Autor: 范阳峰
 * @Date: 2020-07-06 16:12:02
 * @LastEditors: 范阳峰
 * @LastEditTime: 2021-08-17 18:34:34
 */

export function buildAdapter<F extends Obj>(platform: F) {
  function request({ url, params = {}, data = params, headers = {}, ...config }: Required<RequestConfig>) {
    const { 'content-type': type, ..._header } = headers
    if (data.filePath && type === 'multipart/form-data') {
      return upload(url, data, _header, config.signal)
    }
    if (config.responseType === 'blob') {
      return download(url, headers, config.signal)
      // return fetch(new Request(baseURL + url, { headers }))
      // .then(response => response.blob())
    }

    return new Promise((resolve, reject) => {
      const task = platform.request({
        url,
        data,
        header: headers,
        ...config,
        // success: resolve,
        fail(err: any) {
          reject(err)
        },
        success(res: any) {
          const code = res.statusCode
          if (code === 200) {
            resolve(res)
          } else {
            let err
            if (code === 426 && res.header.verifyfailurenum) {
              err = {
                code,
                message: res.data.msg,
                verifyfailurenum: res.header.verifyfailurenum,
              }
            } else {
              err = {
                code,
                message: typeof res.data === 'string' ? res.data : res.data.msg || res.data.message,
              }
            }
            reject(err)
          }
        },
        complete(res: any) {
          // console.log(`${baseURL + url}`, res)
        },
      })
      config.signal?.addEventListener(
        'abort',
        () => {
          task?.abort?.()
          reject(config.signal?.reason)
        },
        { once: true }
      )
    })
  }

  function upload(url: string, { filePath, fileKey, ...formData }: Obj = {}, header: Obj, signal?: AbortSignal) {
    return new Promise((resolve, reject) => {
      const task = platform.uploadFile({
        url,
        filePath,
        name: fileKey,
        formData,
        header,
        fail(err: any) {
          // console.log('uploadErr:' + url + err)
          reject(err)
        },
        success(res: any) {
          const { statusCode: code, data } = res
          if (code === 200) {
            resolve({ code, data: JSON.parse(data) })
          } else {
            reject({ code, message: res.data })
          }
        },
      })
      signal?.addEventListener(
        'abort',
        () => {
          task?.abort?.()
          reject(signal.reason)
        },
        { once: true }
      )
    })
  }

  /** 发起一个 HTTP GET 请求，返回文件的本地临时路径 */
  function download(url: string, header: Obj, signal?: AbortSignal) {
    return new Promise((resolve, reject) => {
      const task = platform.downloadFile({
        url,
        header,
        success({ tempFilePath, statusCode: code, data }: any) {
          if (code === 200) {
            resolve({ code, data: tempFilePath })
          } else {
            reject({ code, message: data })
          }
        },
        fail(err: any) {
          // console.log('downLoadErr:' + url + err)
          reject(err)
        },
      })
      signal?.addEventListener(
        'abort',
        () => {
          task?.abort?.()
          reject(signal.reason)
        },
        { once: true }
      )
    })
  }

  return request
}
