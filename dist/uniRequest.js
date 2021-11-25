/*!
  * api-datamodel v0.2.2
  * (c) 2021 范阳峰 covien@msn.com
  * @license MIT
  */
/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __rest(s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
}

function request(_a) {
    var { url, baseURL = '', params = {}, data = params, headers = {} } = _a, config = __rest(_a, ["url", "baseURL", "params", "data", "headers"]);
    const { 'content-type': type } = headers, _header = __rest(headers, ['content-type']);
    if (data.filePath && type === 'multipart/form-data') {
        return _upload(baseURL + url, data, _header);
    }
    if (config.responseType === 'blob') {
        return _download(baseURL + url, headers);
        // return fetch(new Request(baseURL + url, { headers }))
        // .then(response => response.blob())
    }
    return new Promise((resolve, reject) => {
        uni.request(Object.assign(Object.assign({ data, url: baseURL + url, header: headers }, config), { 
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
            } }));
    });
}
function _upload(url, _a = {}, header) {
    var { filePath, fileKey } = _a, formData = __rest(_a, ["filePath", "fileKey"]);
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
