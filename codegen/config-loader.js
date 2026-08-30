import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export const defaultConfigFiles = [
  'api-datamodel.config.ts',
  'api-datamodel.config.mts',
  'api-datamodel.config.mjs',
  'api-datamodel.config.js',
  'api-datamodel.config.cts',
  'api-datamodel.config.cjs',
  'api-datamodel.config.json',
]

export async function fileExists(filePath) {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

function assertObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${name} 必须是对象`)
}

function assertOptionalString(value, name, allowEmpty = false) {
  if (value === undefined) return
  if (typeof value !== 'string' || (!allowEmpty && !value.trim())) {
    throw new Error(`${name} 必须是${allowEmpty ? '' : '非空'}字符串`)
  }
}

function validateDocumentRequest(value, name) {
  if (value === undefined) return
  assertObject(value, name)
  if (value.timeout !== undefined && (!Number.isFinite(value.timeout) || value.timeout <= 0)) {
    throw new Error(`${name}.timeout 必须是大于 0 的数字`)
  }
  if (value.headers !== undefined) {
    assertObject(value.headers, `${name}.headers`)
    for (const [header, headerValue] of Object.entries(value.headers)) {
      if (typeof headerValue !== 'string') throw new Error(`${name}.headers.${header} 必须是字符串`)
    }
  }
}

function validateApiOptions(options, name, requireUrl = false) {
  assertObject(options, name)
  assertOptionalString(options.url, `${name}.url`)
  if (requireUrl && !options.url) throw new Error(`${name}.url 不能为空`)
  assertOptionalString(options.outputDir, `${name}.outputDir`)
  assertOptionalString(options.outputFolder, `${name}.outputFolder`)
  assertOptionalString(options.label, `${name}.label`)
  if (options.service !== undefined) {
    assertObject(options.service, `${name}.service`)
    assertOptionalString(options.service.importPath, `${name}.service.importPath`)
    assertOptionalString(options.service.importName, `${name}.service.importName`)
    if (options.service.importName && !/^[A-Za-z_$][\w$]*$/.test(options.service.importName)) {
      throw new Error(`${name}.service.importName 必须是有效的导出名称`)
    }
    if (options.service.rootPath !== undefined && typeof options.service.rootPath !== 'string') {
      throw new Error(`${name}.service.rootPath 必须是字符串`)
    }
    if (options.service.rootPathSource !== undefined && !['gateway', 'document'].includes(options.service.rootPathSource)) {
      throw new Error(`${name}.service.rootPathSource 只能是 gateway 或 document`)
    }
  }
  if (options.responseSchema !== undefined) {
    assertObject(options.responseSchema, `${name}.responseSchema`)
    assertOptionalString(options.responseSchema.namePrefix, `${name}.responseSchema.namePrefix`, true)
    assertOptionalString(options.responseSchema.dataField, `${name}.responseSchema.dataField`, true)
  }
  if (options.generatorOptions !== undefined) {
    assertObject(options.generatorOptions, `${name}.generatorOptions`)
    assertOptionalString(options.generatorOptions.templates, `${name}.generatorOptions.templates`)
  }
  validateDocumentRequest(options.documentRequest, `${name}.documentRequest`)
  if (options.duplicateMethodStrategy !== undefined && !['strip', 'keep-suffix', 'error'].includes(options.duplicateMethodStrategy)) {
    throw new Error(`${name}.duplicateMethodStrategy 只能是 strip、keep-suffix 或 error`)
  }
}

export function validateProjectConfig(config) {
  assertObject(config, '配置文件')
  validateApiOptions(config, '配置文件')
  if (config.apis !== undefined) {
    assertObject(config.apis, '配置文件.apis')
    for (const [name, api] of Object.entries(config.apis)) validateApiOptions(api, `配置文件.apis.${name}`, true)
  }
  return config
}

export async function loadProjectConfig(cwd, configPath) {
  let resolvedPath
  if (configPath) {
    resolvedPath = path.resolve(cwd, configPath)
    if (!(await fileExists(resolvedPath))) throw new Error(`配置文件不存在：${resolvedPath}`)
  } else {
    for (const fileName of defaultConfigFiles) {
      const candidate = path.resolve(cwd, fileName)
      if (await fileExists(candidate)) {
        resolvedPath = candidate
        break
      }
    }
  }
  if (!resolvedPath) return { config: {}, configPath: undefined }

  let config
  const extension = path.extname(resolvedPath).toLowerCase()
  try {
    if (extension === '.json') config = JSON.parse(await readFile(resolvedPath, 'utf8'))
    else if (['.ts', '.mts', '.cts'].includes(extension)) {
      const { createJiti } = await import('jiti')
      config = await createJiti(import.meta.url).import(resolvedPath, { default: true })
    } else {
      const configModule = await import(pathToFileURL(resolvedPath).href)
      config = configModule.default ?? configModule
    }
    if (typeof config === 'function') config = await config()
  } catch (error) {
    throw new Error(`加载配置文件失败：${resolvedPath}：${error.message}`, { cause: error })
  }
  return { config: validateProjectConfig(config), configPath: resolvedPath }
}

export function resolveNamedApi(config, name) {
  const api = config.apis?.[name]
  if (!api) {
    const available = Object.keys(config.apis ?? {})
    const suffix = available.length ? `，可用配置：${available.join('、')}` : ''
    throw new Error(`未找到接口配置“${name}”${suffix}`)
  }
  // 这些配置包含可继承的子项，直接浅合并会丢失全局设置，因此按配置层级分别合并。
  const options = {
    ...config,
    ...api,
    generatorOptions: { ...(config.generatorOptions ?? {}), ...(api.generatorOptions ?? {}) },
    responseSchema: { ...(config.responseSchema ?? {}), ...(api.responseSchema ?? {}) },
    service: { ...(config.service ?? {}), ...(api.service ?? {}) },
    documentRequest: {
      ...(config.documentRequest ?? {}),
      ...(api.documentRequest ?? {}),
      headers: { ...(config.documentRequest?.headers ?? {}), ...(api.documentRequest?.headers ?? {}) },
    },
    outputFolder: api.outputFolder ?? name,
  }
  delete options.apis
  validateApiOptions(options, `接口配置 ${name}`, true)
  return options
}
