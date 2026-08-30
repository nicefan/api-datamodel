interface RequestHooks {
  showLoading?(): void
  interceptError?(error: any, context: { abortAll(): void }): void
  complete?(result: RequestBatchResult): void
}

interface RequestBatchResult {
  errors: MessageData[]
  successes: MessageData[]
}

interface RequestBatch extends RequestBatchResult {
  status: 'pending' | 'loading' | 'settling'
  activeCount: number
  hasManualSuccess: boolean
  loadingShown: boolean
  showTimer?: ReturnType<typeof setTimeout>
  settleTimer?: ReturnType<typeof setTimeout>
}

interface ActiveRequest {
  controller: AbortController
  batch?: RequestBatch
  messageMode?: ErrorMessageMode
  completed: boolean
}

let hooks: RequestHooks = {}

export function setRequestHooks(nextHooks: RequestHooks) {
  hooks = nextHooks || {}
}

function normalizeMessage(message: MessageData | string, type: MessageData['type']): MessageData | undefined {
  const data = typeof message === 'string' ? { message } : { ...message }
  if (!data.message) return
  return { ...data, type }
}

function formatError(code?: string | number, originalMessage = '') {
  let message = originalMessage

  if (code === 401 || code === -2) {
    const hasChinese = /.*[\u4e00-\u9fa5]+.*$/
    message = hasChinese.test(message) ? message : '授权失败，请重新登录'
  } else if (code === 408 || code === 'ECONNABORTED') {
    message = '连接超时'
  } else if (message === 'Network Error') {
    message = '网络连接失败'
  } else if (code === 500) {
    message = message || '内部服务器错误'
  }

  return message
}

function isCancellation(error: any, request: ActiveRequest) {
  return (
    request.controller.signal.aborted ||
    error?.name === 'AbortError' ||
    error?.code === 'ABORT_ERR' ||
    error?.code === 'ERR_CANCELED'
  )
}

class RequestManager {
  private activeRequests = new Set<ActiveRequest>()
  private currentBatch?: RequestBatch

  start(
    controller: AbortController,
    options: { silent?: boolean; messageMode?: ErrorMessageMode }
  ) {
    const silent = Boolean(options.silent)
    const request: ActiveRequest = {
      controller,
      messageMode: options.messageMode,
      completed: false,
    }

    // silent 请求仍纳入全局中止和系统错误拦截，但不创建反馈批次。
    if (!silent) {
      const batch = this.getOrCreateBatch()
      request.batch = batch
      batch.activeCount++
      this.scheduleShow(batch)
    }

    this.activeRequests.add(request)
    return request
  }

  addBackendSuccess(request: ActiveRequest, message: MessageData | string) {
    const batch = request.batch
    if (!batch || batch.hasManualSuccess) return
    const data = normalizeMessage(message, 'success')
    if (data) batch.successes.unshift(data)
  }

  setMessage(message: MessageData | string = '') {
    const batch = this.currentBatch
    if (!batch) return

    const data = normalizeMessage(message, 'success')
    if (!data) return

    if (!batch.hasManualSuccess) {
      batch.hasManualSuccess = true
      batch.successes = []
    }
    batch.successes.unshift(data)
  }

  handleError(request: ActiveRequest, error: any) {
    // 取消不属于业务错误，不进入拦截和消息聚合。
    if (isCancellation(error, request)) return

    const code = error?.code ?? error?.status ?? -1
    const message = formatError(code, error?.message)
    const normalizedError = { ...error, code, message, messageMode: request.messageMode }

    try {
      hooks.interceptError?.(normalizedError, { abortAll: () => this.abortAll() })
    } catch {
      // Hook 是外部扩展点，不能影响原请求的错误和收尾。
    }

    const batch = request.batch
    if (!batch) return
    const data = normalizeMessage(
      { ...normalizedError, type: 'error' } as MessageData,
      'error'
    )
    if (data) batch.errors.unshift(data)
  }

  complete(request: ActiveRequest) {
    if (request.completed) return
    request.completed = true
    this.activeRequests.delete(request)

    const batch = request.batch
    if (!batch) return
    batch.activeCount--

    if (batch.activeCount <= 0 && batch.status === 'pending' && batch.showTimer) {
      clearTimeout(batch.showTimer)
      batch.showTimer = undefined
    }

    if (batch.activeCount <= 0) this.scheduleSettle(batch)
  }

  abortAll() {
    for (const request of this.activeRequests) {
      if (!request.controller.signal.aborted) request.controller.abort()
    }
  }

  private getOrCreateBatch() {
    const current = this.currentBatch
    if (current) {
      if (current.settleTimer) {
        clearTimeout(current.settleTimer)
        current.settleTimer = undefined
      }
      if (current.status === 'settling') current.status = current.loadingShown ? 'loading' : 'pending'
      return current
    }

    const batch: RequestBatch = {
      status: 'pending',
      activeCount: 0,
      errors: [],
      successes: [],
      hasManualSuccess: false,
      loadingShown: false,
    }
    this.currentBatch = batch
    return batch
  }

  private scheduleShow(batch: RequestBatch) {
    if (batch.status !== 'pending' || batch.showTimer) return
    batch.showTimer = setTimeout(() => {
      batch.showTimer = undefined
      if (this.currentBatch !== batch || batch.activeCount <= 0 || batch.status !== 'pending') return
      batch.status = 'loading'
      batch.loadingShown = true
      try {
        hooks.showLoading?.()
      } catch {
        // Loading Hook 失败不能打断请求链路。
      }
    }, 200)
  }

  private scheduleSettle(batch: RequestBatch) {
    if (batch.settleTimer) return
    batch.status = 'settling'
    batch.settleTimer = setTimeout(() => {
      batch.settleTimer = undefined
      if (this.currentBatch !== batch || batch.activeCount > 0) return

      if (batch.showTimer) clearTimeout(batch.showTimer)
      this.currentBatch = undefined

      try {
        hooks.complete?.({ errors: [...batch.errors], successes: [...batch.successes] })
      } catch {
        // complete 执行前已重置批次，Hook 失败不影响后续请求。
      }
    }, 0)
  }
}

const requestManager = new RequestManager()

export type { ActiveRequest, RequestBatchResult, RequestHooks }
export default requestManager
