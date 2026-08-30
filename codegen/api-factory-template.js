export function createApiFactoryContent(service) {
  if (!service.importPath) throw new Error('service.importPath 必须指向已配置 Service 所在的模块')
  if (!service.importName) throw new Error('service.importName 必须指定导出的 Service 名称')
  if (!/^[A-Za-z_$][\w$]*$/.test(service.importName)) {
    throw new Error('service.importName 必须是有效的导出名称')
  }

  const serviceExpression = service.rootPath
    ? `${service.importName}.with({ rootPath: ${JSON.stringify(service.rootPath)} })`
    : service.importName
  return [
    `import { ${service.importName} } from ${JSON.stringify(service.importPath)}`,
    '',
    `export default ${serviceExpression}.createApi`,
    '',
  ].join('\n')
}
