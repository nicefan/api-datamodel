# 快速开始

## 安装

```bash
pnpm add api-datamodel
```

如果需要使用 Axios：

```bash
pnpm add axios
```

## 创建 Resource

```ts
import {
  fetchAdapter,
  defineConfig,
  serviceInit,
  setLoadingServe,
} from 'api-datamodel'

setLoadingServe({
  show() {},
  close() {},
})

const config = defineConfig({
  adapter: fetchAdapter,
  serverUrl: '/api',
  defRequestConfig: {
    timeout: 30000,
  },
  requestInterceptors(config) {
    return config
  },
  transformResponse(result) {
    return {
      code: result.code,
      message: result.msg,
      data: result.data,
      success: result.code === 0,
    }
  },
})

export const createApi = serviceInit(config)
```

Resource 负责后台服务配置，Api 负责业务模块描述。

## 定义业务 Api

```ts
export const userApi = createApi('user', {
  list(query) {
    return this.$http.get('list', query)
  },

  getInfo(id) {
    return this.$http.get(`${id}`)
  },

  save(data) {
    return this.$http.post('save', data)
  },
})
```

业务代码：

```ts
const users = await userApi.list({ page: 1 })
const user = await userApi.getInfo(1001)
```

## 请求路径

当：

```text
serverUrl  /api
Api        user
method     list
```

最终请求：

```text
/api/user/list
```

业务层只关注：

```ts
userApi.list()
```

无需维护完整请求地址。