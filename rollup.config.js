import { readFileSync } from 'node:fs'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import ts from '@rollup/plugin-typescript'
import dts from 'rollup-plugin-dts'

const global = readFileSync(new URL('./src/types.d.ts', import.meta.url))

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))
const dir = 'dist'
const banner = `/*!
  * ${pkg.name} v${pkg.version}
  * (c) ${new Date().getFullYear()} 范阳峰 covien@msn.com
  * @license MIT
  */`

const tsPlugin = ts({
  lib: ['esnext', 'dom'],
  target: 'es2022',
  declaration: false,
  outDir: dir,
  tsconfig: './tsconfig.json',
})
const mainFile = 'src/index.ts'

const input = [mainFile, 'src/dataCache.ts']

const es = {
  input,
  output: {
    banner,
    dir: '.',
    entryFileNames: dir + '/[name].js',
    format: 'es',
  },
  plugins: [resolve(), commonjs(), tsPlugin],
}

const types = {
  input: mainFile,
  output: {
    intro: global,
    format: 'es',
    dir: '.',
    entryFileNames: dir + '/[name].d.ts',
  },
  plugins: [dts()],
}

export default [es, types]
