const identifier = '[A-Za-z_$][\\w$]*'
const defaultImportPattern = new RegExp(`^import\\s+(${identifier})\\s+from\\s+(['"])\\S+\\2\\s*;?$`)
const namedImportPattern = new RegExp(`^import\\s*\\{\\s*(${identifier})\\s*\\}\\s*from\\s+(['"])\\S+\\2\\s*;?$`)

export function parseImportStatement(value) {
  const statement = value.trim()
  const match = statement.match(defaultImportPattern) ?? statement.match(namedImportPattern)
  if (!match) throw new Error('importStatement 仅支持单个默认导入或单成员具名导入')
  return { statement, importName: match[1] }
}

export function createApiFactoryContent(importConfig, service) {
  const serviceExpression = `${importConfig.importName}.with({ basePath: ${JSON.stringify(service.basePath)} })`
  return [
    importConfig.statement,
    '',
    `export default ${serviceExpression}.createApi`,
    '',
  ].join('\n')
}
