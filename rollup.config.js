import ts from 'rollup-plugin-typescript2'
import { terser } from 'rollup-plugin-terser';
export default {
  // input 是打包入口文件路径
  // input: 'src/uniRequest.ts',
  input: {
    datamodel: 'src/index.ts',
    uniRequest: 'src/uniRequest.ts'
  },
  // 输出配置
  output: [{
    // 输出路径及文件名
    // entryFileNames: 'dist/[name].js',
    dir: 'dist',
    // file: 'dist/index2.es.js',
    // 输出格式
    format: 'es'
  },
    // {
    //     // 输出路径及文件名
    //     file: 'dist/bundle.min.js',
    //     // 输出格式
    //     format: 'es',
    //     plugins: [terser()]
    //   },
    // {
    //   // 输出路径及文件名
    //   file: 'dist/bundle.umd.js',
    //   // 输出格式
    //   format: 'umd',
    //   name:'dataModal',
    //   plugins: [terser()]
    // }
  ],
  plugins: [
    ts(
      {
        tsconfigOverride: { compilerOptions: { declaration: false } }
      }
    ),
  ]
}