# CacheResult

CacheResult 是独立的请求缓存管理工具，也可以与 DataModel 之外的异步方法一起使用。

## 基本使用

```ts
import { createCache } from 'api-datamodel'

const getUsers = createCache(userApi.list)

const cache = getUsers({ page: 1 })
const result = await cache.getResult()
```

相同方法使用相同参数调用时，会复用对应的缓存结果。

重新加载：

```ts
await cache.reload()
```

## 数据映射

记录映射：

```ts
const getDepartments = createCache({
  request: deptApi.list,
  keyField: 'deptId',
})

const departmentMap = await getDepartments().getMap()
```

字典映射：

```ts
const getStatuses = createCache({
  request: statusApi.list,
  keyField: 'code',
  labelField: 'name',
})

const statusMap = await getStatuses().getMap()
```

## 主要 API

| API | 说明 |
| --- | --- |
| `getResult()` | 获取缓存结果 |
| `result` | 获取当前结果并触发加载 |
| `getMap()` | 获取映射结果 |
| `map` | 获取当前映射并触发加载 |
| `reload()` | 重新请求 |

需要集中管理多个缓存时，可以使用 `createCacheStore()`。
