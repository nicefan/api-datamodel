function request({ url, baseURL = '', params = {}, data = params, headers = {}, ...config }) {
    const { 'content-type': type, ..._header } = headers;
    if (data.filePath && type === 'multipart/form-data') {
        return _upload(baseURL + url, data, _header);
    }
    if (config.responseType === 'blob') {
        return _download(baseURL + url, headers);
        // return fetch(new Request(baseURL + url, { headers }))
        // .then(response => response.blob())
    }
    return new Promise((resolve, reject) => {
        uni.request({
            data,
            url: baseURL + url,
            header: headers,
            ...config,
            // success: resolve,
            fail(err) {
                reject(err);
            },
            success(res) {
                const code = res.statusCode;
                if (code === 200) {
                    resolve(res);
                }
                else {
                    let err;
                    if (code === 426 && res.header.verifyfailurenum) {
                        err = { code, message: res.data.msg, verifyfailurenum: res.header.verifyfailurenum };
                    }
                    else {
                        err = { code, message: typeof res.data === 'string' ? res.data : res.data.msg || res.data.message };
                    }
                    reject(err);
                }
            },
            complete(res) {
                // console.log(`${baseURL + url}`, res)
            },
        });
    });
}
function _upload(url, { filePath, fileKey, ...formData } = {}, header) {
    return new Promise((resolve, reject) => {
        uni.uploadFile({
            url,
            filePath,
            name: fileKey,
            formData,
            header,
            fail(err) {
                // console.log('uploadErr:' + url + err)
                resolve(err);
            },
            success(res) {
                const { statusCode: code, data } = res;
                if (code === 200) {
                    resolve({ code, data: JSON.parse(data) });
                }
                else {
                    reject({ code, message: res.data });
                }
            },
        });
    });
}
/** 发起一个 HTTP GET 请求，返回文件的本地临时路径 */
function _download(url, header) {
    return new Promise((resolve, reject) => {
        uni.downloadFile({
            url,
            header,
            success({ tempFilePath, statusCode: code, data }) {
                if (code === 200) {
                    resolve({ code, data: tempFilePath });
                }
                else {
                    reject({ code, message: data });
                }
            },
            fail(err) {
                // console.log('downLoadErr:' + url + err)
                resolve(err);
            },
        });
    });
}
var uniRequest = {
    name: 'uni',
    request,
};

export { uniRequest as default };
