#!/usr/bin/env node

import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import inquirer from 'inquirer'
import { generateApi } from 'swagger-typescript-api'

const defaultConfigFiles = [
  'api-datamodel.config.mjs',
  'api-datamodel.config.js',
  'api-datamodel.config.cjs',
  'api-datamodel.config.json',
]

const builtInTemplateDir = path.resolve(fileURLToPath(import.meta.url), '../templates')

function printHelp() {
  console.log(`用法：
  api-datamodel-swagger <文档地址> <输出文件夹> [业务前缀]
  api-datamodel-swagger <接口配置名称>

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
  if (path.extname(resolvedPath).toLowerCase() === '.json') {
    config = JSON.parse(await readFile(resolvedPath, 'utf8'))
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

function resolveTemplateDir(cwd, template, folder) {
  const templateName = template ?? (folder === 'lowCodeApi' ? 'lowcode' : 'modular')
  if (templateName === 'lowcode' || templateName === 'modular') {
    return path.resolve(builtInTemplateDir, templateName)
  }
  return path.resolve(cwd, templateName)
}

async function generate({ cwd, url, folder, prePath, output, httpPath, httpModule, template, generator = {} }) {
  if (!url) throw new Error('Swagger 文档地址不能为空')
  if (!folder) throw new Error('输出文件夹不能为空')

  const outputDir = path.resolve(cwd, output ?? './src/api', folder)
  const templateDir = resolveTemplateDir(cwd, template, folder)
  const generatorFileNames = generator.fileNames ?? {}
  const outputFiles = await generateApi({
    modular: true,
    routeTypes: true,
    generateClient: true,
    moduleNameFirstTag: true,
    cleanOutput: true,
    ...generator,
    url: encodeURI(url),
    output: outputDir,
    templates: templateDir,
    fileNames: {
      ...generatorFileNames,
      httpPath: httpPath ?? generatorFileNames.httpPath ?? '@/api/dataModel',
      httpModule: httpModule ?? generatorFileNames.httpModule ?? 'createApi',
      prePath: prePath === undefined ? generatorFileNames.prePath ?? '' : prePath ? `${prePath}/` : '',
    },
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
    generator: {
      ...(config.generator ?? {}),
      ...(api.generator ?? {}),
      fileNames: {
        ...(config.generator?.fileNames ?? {}),
        ...(api.generator?.fileNames ?? {}),
      },
    },
    folder: api.folder ?? name,
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
        name: 'folder',
        message: '文件夹名',
        default: 'default',
        validate(value) {
          return !value.length ? new Error('保存位置不能为空') : true
        },
      },
      {
        type: 'input',
        name: 'prePath',
        message: '业务名称/前缀(可为空)',
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
        name: config.apis[value].description ?? value,
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
  const [first, folder, prePath] = positional
  let options

  if (!first) {
    options = await promptForApi(config)
  } else if (/^https?:\/\//i.test(first)) {
    const directOptions = {
      ...config,
      url: first,
      folder: folder === '-d' ? 'def' : folder,
      prePath: folder === '-d' ? '' : prePath,
    }
    options = directOptions.folder ? directOptions : await promptForManualConfig(config, directOptions)
  } else {
    options = resolveNamedApi(config, first)
  }

  await generate({ cwd, ...options })
  if (configPath) console.log(`已使用配置：${configPath}`)
}

main().catch((error) => {
  console.error(`接口生成失败：${error.message}`)
  process.exitCode = 1
})
