// import ts from 'rollup-plugin-typescript2'
import path from 'path'
import { terser } from 'rollup-plugin-terser';
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import ts from '@rollup/plugin-typescript'

const pkg = require('./package.json')
const name = pkg.name
const dir = 'dist'
const banner = `/*!
  * ${pkg.name} v${pkg.version}
  * (c) ${new Date().getFullYear()} 范阳峰 covien@msn.com
  * @license MIT
  */`

const tsPlugin = ts({
  lib: ["esnext"],
  target: "es2015",
  declaration: false,
  outDir: dir,
  declarationDir: dir + '/types',
  // check: true,
  tsconfig: path.resolve(__dirname, 'tsconfig.json'),
  // cacheRoot: path.resolve(__dirname, 'node_modules/.rts2_cache'),
  // tsconfigOverride: { compilerOptions: { declaration: false,declarationMap: false } }
})
const mainFile = 'src/index.ts'
export default [
  {
  input: mainFile,
  output: {
      banner,
      format: 'cjs',
      file: pkg.main,
    },
    plugins: [
      tsPlugin,
      commonjs()
    ]
  },
  {
    input: mainFile,
    output: {
      banner,
      format: 'es',
      file: pkg.module,
    },
    plugins: [
      tsPlugin
    ]
  }
]

