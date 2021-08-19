import { defineConfig } from 'vite'
import { resolve} from 'path'
import ts from 'rollup-plugin-typescript2'
import dts from 'vite-plugin-dts'
// https://vitejs.dev/config/
export default defineConfig({
  build: {
    // outDir: 'dist',

    lib: {
      entry: resolve(__dirname, 'lib/index.ts'),
      name: 'DataModel',
      fileName: (format) => `data-model.${format}.js`
    },
    rollupOptions: {
      plugins: [
        ts()
      ],
      // output: {
      //   // https://rollupjs.org/guide/en/#outputmanualchunks
      //   manualChunks: {
      //     vlib: ['vue', 'vue-router']
      //   }
      // }
    }
  },
})
