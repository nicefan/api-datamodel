import { readFileSync } from 'node:fs'
import terser from '@rollup/plugin-terser'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import eslint from '@rollup/plugin-eslint'
import ts from '@rollup/plugin-typescript'
import dts from 'rollup-plugin-dts'

const global = readFileSync(new URL('./src/types.d.ts', import.meta.url))

const pkg = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf-8')
)
const name = pkg.name
const dir = 'dist'
const declarationDir = dir + '_types'
const banner = `/*!
  * ${pkg.name} v${pkg.version}
  * (c) ${new Date().getFullYear()} 范阳峰 covien@msn.com
  * @license MIT
  */`

const tsPlugin = ts({
  lib: ['esnext', 'dom'],
  target: 'es2015',
  declaration: false,
  outDir: dir,
  declarationDir: declarationDir,
  // check: true,
  tsconfig: './tsconfig.json',
  // cacheRoot: path.resolve(__dirname, 'node_modules/.rts2_cache'),
  // tsconfigOverride: { compilerOptions: { declaration: false,declarationMap: false } }
})
const lintPlugin = eslint({
  fix: true,
  include: ['./dist/*', './dist_types/**/*'],
  throwOnWarning: false,
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
  plugins: [tsPlugin],
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

const cjs = {
  input,
  output: {
    dir,
    banner,
    format: 'cjs',
    entryFileNames: '[name].cjs',
  },
  plugins: [commonjs()],
}

export default [es, types]
