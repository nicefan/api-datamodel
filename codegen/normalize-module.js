function trimSlashes(value) {
  return value.replace(/^\/+|\/+$/g, '')
}

function normalizedPath(value) {
  return value.startsWith('/') ? value : `/${value}`
}

function createPathNormalizer(service) {
  const rootPath = trimSlashes(service.rootPath ?? '')
  if (service.rootPathSource !== 'document' || !rootPath) return normalizedPath
  const segments = rootPath.split('/').filter(Boolean)
  // 网关可能只把 rootPath 的后半段写进文档，依次生成后缀以兼容完整前缀和尾部前缀。
  const prefixes = segments.map((_, index) => `/${segments.slice(index).join('/')}`)
  return (value) => {
    const routePath = normalizedPath(value)
    const prefix = prefixes.find((item) => routePath === item || routePath.startsWith(`${item}/`))
    return prefix ? routePath.slice(prefix.length) || '/' : routePath
  }
}

function routeParts(moduleRoute, normalizePath) {
  return normalizePath(moduleRoute.routes[0].request.path).split('/').filter(Boolean)
}

export function normalizeModule({ moduleRoute, combinedModules, modelTypes, responseSchemaPrefix, service, duplicateMethodStrategy, pascalCase }) {
  const normalizePath = createPathNormalizer(service)
  const parts = routeParts(moduleRoute, normalizePath)
  const resourceName = parts[0] ?? ''
  // 一级资源路径相同且存在嵌套路由时，用第二段路径区分模块，避免生成文件互相覆盖。
  const candidateName = (item) => {
    const itemParts = routeParts(item, normalizePath)
    const first = itemParts[0] ?? ''
    const nestedConflict = combinedModules.some((other) => {
      if (other.moduleName === item.moduleName) return false
      return normalizePath(other.routes[0].request.path).startsWith(`/${first}/`)
    })
    return first + (nestedConflict ? pascalCase(itemParts[1] ?? '') : '')
  }
  let moduleName = candidateName(moduleRoute)
  if (combinedModules.filter((item) => candidateName(item) === moduleName).length > 1) {
    moduleName = resourceName + pascalCase(parts[1] ?? '')
  }

  // swagger-typescript-api 会给重复 operationId 添加数字后缀，先按去除后缀后的名称分组再应用配置策略。
  const groups = moduleRoute.routes.reduce((result, item) => {
    const name = item.raw.operationId.replace(/_\d+$/, '')
    ;(result[name] ??= []).push(item)
    return result
  }, {})
  const duplicateGroups = Object.entries(groups).filter(([, items]) => items.length > 1)
  const duplicateNames = new Set(duplicateGroups.map(([name]) => name))
  const diagnostics = duplicateGroups.map(([methodName, items]) => ({
    level: duplicateMethodStrategy === 'keep-suffix' ? 'warning' : 'error',
    moduleName,
    methodName,
    operations: items.map((item) => ({
      operationId: item.raw.operationId,
      method: item.request.method,
      path: item.raw.route ?? item.request.path,
    })),
  }))

  // 上游 route 还会被其他模板复用，这里创建新对象，避免 shortPath 和方法名污染原始解析结果。
  const routes = moduleRoute.routes.map((route) => {
    const original = route.raw.operationId
    const stripped = original.replace(/_\d+$/, '')
    const duplicate = duplicateNames.has(stripped)
    const methodName = duplicateMethodStrategy === 'keep-suffix' && duplicate ? original : stripped
    const routePath = normalizePath(route.request.path)
    return {
      ...route,
      request: { ...route.request, shortPath: routePath.replace(`/${resourceName}`, '') },
      routeName: { original, value: methodName, duplicate },
    }
  })
  return {
    dataContracts: modelTypes.map(({ name }) => name).filter((name) => !responseSchemaPrefix || !name.startsWith(responseSchemaPrefix)),
    diagnostics,
    moduleName,
    resourceName,
    routes,
  }
}
