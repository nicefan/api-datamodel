/*
 * @Description: taro、uni移动端跨平台请求方式适配
 * @Autor: 范阳峰
 * @Date: 2020-07-06 16:12:02
 * @LastEditors: 范阳峰
 * @LastEditTime: 2021-08-17 18:34:34
 */

export function buildAdapter<F extends Obj>(frame: F) {
  function request(
    url: string,
    { params = {}, data = params, headers = {}, ...config }: RequestConfig
  ) {
    const { 'content-type': type, ..._header } = headers
    if (data.filePath && type === 'multipart/form-data') {
      return _upload(url, data, _header)
    }
    if (config.responseType === 'blob') {
      return _download(url, headers)
      // return fetch(new Request(baseURL + url, { headers }))
      // .then(response => response.blob())
    }

    return new Promise((resolve, reject) => {
      frame.request({
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
                message:
                  typeof res.data === 'string'
                    ? res.data
                    : res.data.msg || res.data.message,
              }
            }
            reject(err)
          }
        },
        complete(res: any) {
          // console.log(`${baseURL + url}`, res)
        },
      })
    })
  }

  function _upload(
    url: string,
    { filePath, fileKey, ...formData }: Obj = {},
    header: Obj
  ) {
    return new Promise((resolve, reject) => {
      frame.uploadFile({
        url,
        filePath,
        name: fileKey,
        formData,
        header,
        fail(err: any) {
          // console.log('uploadErr:' + url + err)
          resolve(err)
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
    })
  }

  /** 发起一个 HTTP GET 请求，返回文件的本地临时路径 */
  function _download(url: string, header: Obj) {
    return new Promise((resolve, reject) => {
      frame.downloadFile({
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
          resolve(err)
        },
      })
    })
  }

  return request
}
