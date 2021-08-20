import { defineConfig } from 'vite'
import { resolve} from 'path'
import ts from 'rollup-plugin-typescript2'
import dts from 'vite-plugin-dts'
// https://vitejs.dev/config/
export default defineConfig({
  // plugins: [
  //   dts()
  // ],
  build: {
    // outDir: 'dist',

    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es', 'iife'],
      name:'dataModel',
      fileName: (format) => `data-model.${format}.js`
    },
    minify:false,
    rollupOptions: {
      // output: {
      //   // https://rollupjs.org/guide/en/#outputmanualchunks
      //   manualChunks: {
      //     vlib: ['vue', 'vue-router']
      //   }
      // }
    }
  },
})
