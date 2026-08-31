# 请求批次管理

请求仍然由适配器正常并发执行。批次管理不负责请求排队、限流、去重、重试或缓存，只统一管理活动请求以及与界面有关的 Loading、消息、错误和全局中止。

## 解决什么问题

页面初始化时可能同时请求用户、权限和配置。三个请求应并发执行，但界面通常希望：

- 不为短请求闪烁 Loading；
- 并发请求全部结束后再统一关闭 Loading；
- 集中展示这一批请求的成功或错误消息；
- 系统级错误到达时立即处理；
- 登录失效等场景能够中止所有活动请求。

## 配置请求 Hooks

```ts
interface RequestHooks {
  showLoading?(): void
  interceptError?(error: any, context: { abortAll(): void }): void
  complete?(result: RequestBatchResult): void
}

interface RequestBatchResult {
  errors: MessageData[]
  successes: MessageData[]
}
```

```ts
import { setRequestHooks } from 'api-datamodel'

setRequestHooks({
  showLoading() {
    // 打开全局 Loading
  },
  interceptError(error, { abortAll }) {
    if (error.code === 401) abortAll()
  },
  complete({ errors, successes }) {
    // 关闭 Loading，并统一展示本批消息
  },
})
```

Hooks 是全局配置，再次调用会整体替换当前对象。Hook 自身抛出的错误不会改变原请求或后续批次。

## 一批请求的过程

```text
请求开始
   ↓
登记为活动请求
   ↓
普通请求加入当前反馈批次
   ↓
持续超过 200ms → showLoading()
   ↓
请求成功 / 错误 / 取消
   ↓
记录消息并注销活动请求
   ↓
批次内请求全部结束
   ↓
complete({ errors, successes })
```

批次进入结算但新请求立即到达时，新请求继续加入当前批次。即使 Loading 尚未显示，批次结束时仍会调用 `complete()`。

## 错误与全局中止

非取消错误到达时立即调用 `interceptError()`，不等待其他请求完成。错误会补充规范化后的 `code`、`message` 和当前请求的 `messageMode`。

`abortAll()` 遍历当前登记的活动请求，并通过各请求的内部 `AbortController` 中止它们。它的范围跨越不同 Service、业务 API 和独立 Http 实例。

## 静默请求

`silent: true` 表示该请求不参与界面反馈批次：

- 不触发 Loading；
- 不进入成功或错误消息数组；
- 仍登记为活动请求；
- 非取消错误仍进入 `interceptError()`；
- 仍受 `abortAll()` 控制。

## 取消请求

取消不是业务错误：

- Promise 仍以拒绝结束；
- 不调用 `interceptError()`；
- 不收集成功或错误消息；
- 正常注销活动请求并推进所属批次结算。

单请求如何传入 `AbortSignal`，见 [请求与响应](./request#取消单个请求)。

## 成功消息与 `setMessage()`

业务成功响应中的非空消息会加入 `successes`。业务方法也可以设置手动成功消息：

```ts
save(data: UserInput) {
  return this.$http.post('save', data).then((result) => {
    this.$http.setMessage('保存成功')
    return result
  })
}
```

- 空消息会被忽略；
- 第一次手动成功消息清除此前的后端成功消息；
- 出现手动成功消息后，后续后端成功消息不再收集；
- 后续手动成功消息仍会收集；
- 错误消息始终独立保留；
- 消息按后收到的排在数组前面。

## 实现结构

批次管理内部维护两类状态：

```text
activeRequests
├─ 保存所有活动请求及其 AbortController
└─ 为 abortAll() 提供全局活动范围

currentBatch
├─ activeCount  当前普通请求数量
├─ errors       错误消息
├─ successes    成功消息
├─ showTimer    延迟显示 Loading
└─ settleTimer  等待同一轮后续请求后结算
```

请求开始时先加入 `activeRequests`；非静默请求再加入 `currentBatch`。请求结束时从活动集合移除，并减少批次计数；计数归零后通过零延迟任务结算批次。
