#!/usr/bin/env node

import { runCli } from './cli.js'

runCli().catch((error) => {
  console.error(`接口生成失败：${error.message}`)
  process.exitCode = 1
})
