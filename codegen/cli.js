import path from 'node:path'
import inquirer from 'inquirer'
import { defaultConfigFiles, fileExists, loadProjectConfig, resolveNamedApi, validateProjectConfig } from './config-loader.js'
import { isDocumentSource } from './document-loader.js'
import { generateCode } from './generator.js'

function printHelp() {
  console.log(`API Codegen

根据 Swagger/OpenAPI 文档生成请求代码和数据类型。

用法：
  api-datamodel-codegen <文档地址> <输出文件夹>
  api-datamodel-codegen <接口配置名称>

选项：
  -c, --config <路径>  指定配置文件
  -o, --output <目录>  指定输出文件夹
  -h, --help           显示帮助

默认读取：${defaultConfigFiles.join('、')}`)
}

export function parseArgs(argv) {
  const positional = []
  let configPath
  let outputFolder
  let help = false
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '-h' || arg === '--help') help = true
    else if (arg === '-c' || arg === '--config') {
      configPath = argv[++index]
      if (!configPath) throw new Error(`${arg} 后必须指定配置文件路径`)
    } else if (arg === '-o' || arg === '--output') {
      outputFolder = argv[++index]
      if (!outputFolder) throw new Error(`${arg} 后必须指定输出文件夹`)
    } else if (arg.startsWith('-')) throw new Error(`未知选项：${arg}`)
    else positional.push(arg)
  }
  if (positional.length > 2) throw new Error(`位置参数过多：${positional.slice(2).join(' ')}`)
  if (outputFolder && positional[1]) throw new Error('不能同时使用第二个位置参数和 --output 指定输出文件夹')
  return { configPath, help, outputFolder, positional }
}

async function promptForManualConfig(config, initialAnswers = {}) {
  const answers = await inquirer.prompt([
    { type: 'input', name: 'url', message: '文档地址' },
    {
      type: 'input',
      name: 'outputFolder',
      message: '文件夹名',
      default: 'default',
      validate: (value) => (!value.length ? new Error('保存位置不能为空') : true),
    },
  ], initialAnswers)
  return { ...config, ...answers }
}

async function promptForApi(config) {
  const names = Object.keys(config.apis ?? {})
  if (!names.length) return promptForManualConfig(config)
  const { name } = await inquirer.prompt([{
    type: 'list',
    name: 'name',
    message: '接口配置',
    choices: names.map((value) => ({ name: config.apis[value].label ?? value, value })),
  }])
  return resolveNamedApi(config, name)
}

export async function runCli(argv = process.argv.slice(2), cwd = process.cwd()) {
  const { configPath: configArg, help, outputFolder: outputArg, positional } = parseArgs(argv)
  if (help) return printHelp()
  const { config, configPath } = await loadProjectConfig(cwd, configArg)
  if (configPath) console.log(`配置文件：${configPath}`)

  const [first, positionalOutput] = positional
  let options
  const directSource = first && (isDocumentSource(first) || (await fileExists(path.resolve(cwd, first))))
  if (!first) options = await promptForApi(config)
  else if (directSource) {
    const directOptions = { ...config, url: first, outputFolder: outputArg ?? positionalOutput }
    delete directOptions.apis
    options = directOptions.outputFolder ? directOptions : await promptForManualConfig(config, directOptions)
    validateProjectConfig(options)
  } else {
    options = resolveNamedApi(config, first)
    if (outputArg) options.outputFolder = outputArg
  }
  await generateCode({ cwd, ...options })
}
