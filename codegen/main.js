#!/usr/bin/env node

import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import inquirer from 'inquirer'
import { generateApi } from 'swagger-typescript-api'

const defaultConfigFiles = [
  'api-datamodel.config.ts',
  'api-datamodel.config.mjs',
  'api-datamodel.config.js',
  'api-datamodel.config.cjs',
  'api-datamodel.config.json',
]

const builtInTemplateDir = path.resolve(fileURLToPath(import.meta.url), '../templates')

function printHelp() {
  console.log(`API Codegen

根据 Swagger/OpenAPI 文档生成请求代码和数据类型。

用法：
  api-datamodel-codegen <文档地址> <输出文件夹>
  api-datamodel-codegen <接口配置名称>

选项：
  -c, --config <路径>  指定配置文件
  -h, --help           显示帮助

默认读取：${defaultConfigFiles.join('、')}`)
}

function parseArgs(argv) {
  const positional = []
  let configPath
  let help = false

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '-h' || arg === '--help') {
      help = true
    } else if (arg === '-c' || arg === '--config') {
      configPath = argv[index + 1]
      if (!configPath) throw new Error(`${arg} 后必须指定配置文件路径`)
      index += 1
    } else {
      positional.push(arg)
    }
  }

  return { configPath, help, positional }
}

async function fileExists(filePath) {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

async function loadProjectConfig(cwd, configPath) {
  let resolvedPath

  if (configPath) {
    resolvedPath = path.resolve(cwd, configPath)
    if (!(await fileExists(resolvedPath))) {
      throw new Error(`配置文件不存在：${resolvedPath}`)
    }
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
  if (extension === '.json') {
    config = JSON.parse(await readFile(resolvedPath, 'utf8'))
  } else if (extension === '.ts') {
    const { createJiti } = await import('jiti')
    const jiti = createJiti(import.meta.url)
    config = await jiti.import(resolvedPath, { default: true })
  } else {
    const configModule = await import(pathToFileURL(resolvedPath).href)
    config = configModule.default ?? configModule
  }

  if (typeof config === 'function') config = await config()
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error(`配置文件必须导出一个对象：${resolvedPath}`)
  }

  return { config, configPath: resolvedPath }
}

function formatResponsePreview(content) {
  const preview = content.replace(/\s+/g, ' ').trim()
  if (!preview) return '响应内容为空'
  return preview.length > 200 ? `${preview.slice(0, 200)}…` : preview
}

function describeRequestError(error) {
  const detail = error?.cause?.code ?? error?.cause?.message ?? error?.message
  return detail ? `：${detail}` : ''
}

async function loadSwaggerDocument(url) {
  let response
  try {
    response = await fetch(encodeURI(url), {
      headers: { accept: 'application/json' },
    })
  } catch (error) {
    throw new Error(`无法访问 Swagger 文档地址 ${url}${describeRequestError(error)}`)
  }

  let content
  try {
    content = await response.text()
  } catch (error) {
    throw new Error(`读取 Swagger 文档响应失败（HTTP ${response.status}）${describeRequestError(error)}`)
  }

  if (!response.ok) {
    throw new Error(
      `Swagger 文档请求失败（HTTP ${response.status} ${response.statusText}）：${formatResponsePreview(content)}`
    )
  }

  let document
  try {
    document = JSON.parse(content)
  } catch {
    throw new Error(`Swagger 文档不是有效的 JSON：${formatResponsePreview(content)}`)
  }

  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    throw new Error(`Swagger 文档必须是 JSON 对象：${formatResponsePreview(content)}`)
  }

  if (!document.openapi && !document.swagger) {
    const businessMessage = document.message ?? document.msg ?? document.error
    const businessCode = document.code === undefined ? '' : `（错误码：${document.code}）`
    const detail = businessMessage
      ? `，接口返回业务错误${businessCode}：${businessMessage}`
      : `：${formatResponsePreview(content)}`
    throw new Error(`响应内容不是有效的 Swagger/OpenAPI 文档，缺少 openapi 或 swagger 版本字段${detail}`)
  }

  return document
}

async function generate({
  cwd,
  url,
  outputFolder,
  outputDir,
  resource = {},
  generatorOptions = {},
  responseSchema = {},
}) {
  if (!url) throw new Error('Swagger 文档地址不能为空')
  if (!outputFolder) throw new Error('输出文件夹不能为空')

  const resolvedOutputDir = path.resolve(cwd, outputDir ?? './src/api', outputFolder)
  const resolvedResource = {
    rootPath: '',
    rootPathSource: 'gateway',
    ...resource,
  }
  const resolvedTemplateDir = generatorOptions.templates
    ? path.resolve(cwd, generatorOptions.templates)
    : builtInTemplateDir
  const spec = await loadSwaggerDocument(url)
  let outputFiles
  try {
    outputFiles = await generateApi({
      modular: true,
      routeTypes: true,
      generateClient: true,
      moduleNameFirstTag: true,
      cleanOutput: true,
      ...generatorOptions,
      responseSchema: {
        namePrefix: 'AjaxResult',
        dataField: 'data',
        ...responseSchema,
      },
      resource: resolvedResource,
      spec,
      output: resolvedOutputDir,
      templates: resolvedTemplateDir,
    })
  } catch (error) {
    throw new Error(`生成接口代码时出错：${error.message}`, { cause: error })
  }

  const rootPathOption = resolvedResource.rootPath
    ? `{ rootPath: ${JSON.stringify(resolvedResource.rootPath)} }`
    : ''
  const resourceImport = resolvedResource.importPath
    ? `import Resource from ${JSON.stringify(resolvedResource.importPath)}`
    : "import { ApiResource } from 'api-datamodel'"
  const resourceClassName = resolvedResource.importPath ? 'Resource' : 'ApiResource'
  outputFiles.createFile({
    path: outputFiles.configuration.config.output,
    fileName: 'resource.ts',
    content: [resourceImport, '', `export default ${resourceClassName}.factory(${rootPathOption})`, ''].join(
      '\n'
    ),
  })

  const contentLines = outputFiles.files.map(({ name }) => `export * from './${name.slice(0, -3)}';\n`)
  outputFiles.createFile({
    path: outputFiles.configuration.config.output,
    fileName: 'index.ts',
    content: contentLines.join(''),
  })
}

function resolveNamedApi(config, name) {
  const api = config.apis?.[name]
  if (!api) {
    const available = Object.keys(config.apis ?? {})
    const suffix = available.length ? `，可用配置：${available.join('、')}` : ''
    throw new Error(`未找到接口配置“${name}”${suffix}`)
  }

  return {
    ...config,
    ...api,
    generatorOptions: {
      ...(config.generatorOptions ?? {}),
      ...(api.generatorOptions ?? {}),
    },
    responseSchema: {
      ...(config.responseSchema ?? {}),
      ...(api.responseSchema ?? {}),
    },
    resource: {
      ...(config.resource ?? {}),
      ...(api.resource ?? {}),
    },
    outputFolder: api.outputFolder ?? name,
  }
}

async function promptForManualConfig(config, initialAnswers = {}) {
  const answers = await inquirer.prompt(
    [
      {
        type: 'input',
        name: 'url',
        message: '文档地址',
      },
      {
        type: 'input',
        name: 'outputFolder',
        message: '文件夹名',
        default: 'default',
        validate(value) {
          return !value.length ? new Error('保存位置不能为空') : true
        },
      },
    ],
    initialAnswers
  )
  return { ...config, ...answers }
}

async function promptForApi(config) {
  const names = Object.keys(config.apis ?? {})
  if (!names.length) return promptForManualConfig(config)

  const { name } = await inquirer.prompt([
    {
      type: 'list',
      name: 'name',
      message: '接口配置',
      choices: names.map((value) => ({
        name: config.apis[value].label ?? value,
        value,
      })),
    },
  ])
  return resolveNamedApi(config, name)
}

async function main() {
  const cwd = process.cwd()
  const { configPath: configArg, help, positional } = parseArgs(process.argv.slice(2))
  if (help) {
    printHelp()
    return
  }

  const { config, configPath } = await loadProjectConfig(cwd, configArg)
  if (configPath) console.log(`配置文件：${configPath}`)

  const [first, outputFolder] = positional
  let options

  if (!first) {
    options = await promptForApi(config)
  } else if (/^https?:\/\//i.test(first)) {
    const directOptions = {
      ...config,
      url: first,
      outputFolder: outputFolder === '-d' ? 'def' : outputFolder,
    }
    options = directOptions.outputFolder ? directOptions : await promptForManualConfig(config, directOptions)
  } else {
    options = resolveNamedApi(config, first)
  }

  await generate({ cwd, ...options })
}

main().catch((error) => {
  console.error(`接口生成失败：${error.message}`)
  process.exitCode = 1
})
