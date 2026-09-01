import { access, mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateApi } from 'swagger-typescript-api'
import { loadSwaggerDocument } from './document-loader.js'
import { normalizeModule } from './normalize-module.js'
import { createApiFactoryContent, parseImportStatement } from './api-factory-template.js'

const builtInTemplateDir = path.resolve(fileURLToPath(import.meta.url), '../templates')

async function exists(filePath) {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

function isOutside(parent, target) {
  const relative = path.relative(parent, target)
  return relative.startsWith('..') || path.isAbsolute(relative)
}

function validateOutputPath(cwd, outputRoot, outputDir) {
  // 后续会整体替换输出目录，必须先限制路径范围，防止错误配置移动或删除项目外文件。
  if (isOutside(path.resolve(cwd), outputRoot)) throw new Error(`生成根目录必须位于项目目录内：${outputRoot}`)
  const relative = path.relative(outputRoot, outputDir)
  if (!relative || isOutside(outputRoot, outputDir)) {
    throw new Error(`输出文件夹必须位于生成根目录内且不能等于生成根目录：${outputDir}`)
  }
}

async function resolveTemplateDir(cwd, templates) {
  const templateDir = templates ? path.resolve(cwd, templates) : builtInTemplateDir
  try {
    if (!(await stat(templateDir)).isDirectory()) throw new Error('不是目录')
  } catch (error) {
    throw new Error(`模板目录无效：${templateDir}：${error.message}`, { cause: error })
  }
  return templateDir
}

async function replaceOutputDirectory(tempDir, outputDir) {
  const backupDir = `${outputDir}.backup-${process.pid}-${Date.now()}`
  const hadOutput = await exists(outputDir)
  // 先保留旧目录，再切换到完整的新目录；切换失败时可以恢复，避免留下半生成状态。
  if (hadOutput) await rename(outputDir, backupDir)
  try {
    await rename(tempDir, outputDir)
  } catch (error) {
    if (hadOutput && !(await exists(outputDir))) await rename(backupDir, outputDir)
    throw new Error(`替换生成目录失败：${outputDir}：${error.message}`, { cause: error })
  }
  if (hadOutput) {
    try {
      await rm(backupDir, { recursive: true, force: true })
    } catch (error) {
      console.warn(`清理旧生成目录失败，可手动删除：${backupDir}：${error.message}`)
    }
  }
}

function formatDuplicateDiagnostic(diagnostic) {
  const operations = diagnostic.operations
    .map(({ operationId, method, path: routePath }) => `${operationId}: ${method.toUpperCase()} ${routePath}`)
    .join('\n')
  return `接口命名冲突：\n${operations}`
}

function reportDiagnostics(diagnostics) {
  for (const diagnostic of diagnostics) {
    const message = formatDuplicateDiagnostic(diagnostic)
    if (diagnostic.level === 'warning') console.warn(message)
    else console.error(message)
  }
}

async function removeUpstreamBanners(outputFiles) {
  await Promise.all(outputFiles.files.map(async ({ name }) => {
    const filePath = path.join(outputFiles.configuration.config.output, name)
    const content = await readFile(filePath, 'utf8')
    const markerIndex = content.indexOf('THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API')
    if (markerIndex < 0) return

    // 保留上游添加的 lint 指令，只移除与当前生成器无关的品牌注释。
    const bannerStart = content.lastIndexOf('/*', markerIndex)
    const bannerEnd = content.indexOf('*/', markerIndex)
    if (bannerStart < 0 || bannerEnd < 0) return
    const nextContent = `${content.slice(0, bannerStart)}${content.slice(bannerEnd + 2).replace(/^\r?\n+/, '')}`
    await writeFile(filePath, nextContent)
  }))
}

function createApiFactoryFile(outputFiles, importConfig, service) {
  outputFiles.createFile({
    path: outputFiles.configuration.config.output,
    fileName: 'resource.ts',
    content: createApiFactoryContent(importConfig, service),
  })
}

function createIndexFile(outputFiles, hasResource) {
  const modules = new Set(hasResource ? ['resource'] : [])
  for (const { name } of outputFiles.files) {
    const extension = path.extname(name)
    if (extension === '.ts') modules.add(path.basename(name, extension))
  }
  modules.delete('index')
  const content = [...modules].sort().map((name) => `export * from './${name}';\n`).join('')
  outputFiles.createFile({
    path: outputFiles.configuration.config.output,
    fileName: 'index.ts',
    content,
  })
}

export async function generateCode({
  cwd,
  url,
  outputFolder,
  outputDir,
  importStatement,
  service,
  generatorOptions = {},
  responseSchema = {},
  documentRequest = {},
  duplicateMethodStrategy = 'strip',
}) {
  if (!url) throw new Error('Swagger 文档地址不能为空')
  if (!outputFolder) throw new Error('输出文件夹不能为空')
  if (!importStatement) throw new Error('importStatement 不能为空')

  const resolvedOutputRoot = path.resolve(cwd, outputDir ?? './src/api')
  const resolvedOutputDir = path.resolve(resolvedOutputRoot, outputFolder)
  validateOutputPath(cwd, resolvedOutputRoot, resolvedOutputDir)
  const resolvedTemplateDir = await resolveTemplateDir(cwd, generatorOptions.templates)
  const importConfig = parseImportStatement(importStatement)
  const resolvedService = service ? { pathInDocument: false, ...service } : undefined
  const apiImportConfig = resolvedService
    ? { statement: 'import createApi from "./resource";', importName: 'createApi' }
    : importConfig
  const resolvedResponseSchema = { namePrefix: 'AjaxResult', dataField: 'data', ...responseSchema }
  const spec = await loadSwaggerDocument({ cwd, source: url, request: documentRequest })
  await mkdir(path.dirname(resolvedOutputDir), { recursive: true })
  const tempDir = await mkdtemp(path.join(path.dirname(resolvedOutputDir), `.${path.basename(resolvedOutputDir)}-tmp-`))
  const diagnostics = []

  try {
    const outputFiles = await generateApi({
      modular: true,
      routeTypes: true,
      generateClient: true,
      moduleNameFirstTag: true,
      cleanOutput: true,
      ...generatorOptions,
      responseSchema: resolvedResponseSchema,
      service: resolvedService ?? {},
      codegen: {
        ...apiImportConfig,
        normalizeModule(options) {
          const context = normalizeModule({
            ...options,
            duplicateMethodStrategy,
            service: resolvedService ?? {},
            responseSchemaPrefix: resolvedResponseSchema.namePrefix,
          })
          diagnostics.push(...context.diagnostics)
          if (duplicateMethodStrategy === 'error' && context.diagnostics.length) {
            throw new Error(formatDuplicateDiagnostic(context.diagnostics[0]))
          }
          return context
        },
      },
      spec,
      output: tempDir,
      templates: resolvedTemplateDir,
    })
    await removeUpstreamBanners(outputFiles)
    if (resolvedService) createApiFactoryFile(outputFiles, importConfig, resolvedService)
    createIndexFile(outputFiles, Boolean(resolvedService))
    reportDiagnostics(diagnostics)
    await replaceOutputDirectory(tempDir, resolvedOutputDir)
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true })
    throw new Error(`生成接口代码时出错：${error.message}`, { cause: error })
  }
}
