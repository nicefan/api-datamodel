#!/usr/bin/env node

const nodeMajor = Number(process.versions.node.split('.')[0])
if (nodeMajor < 18) {
  console.error('API Codegen 需要 Node.js 18 或更高版本')
  process.exitCode = 1
} else {
  import('./cli.js')
    .then(({ runCli }) => runCli())
    .catch((error) => {
      console.error(`接口生成失败：${error.message}`)
      process.exitCode = 1
    })
}
