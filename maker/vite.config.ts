import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/ChineseBQB/maker/',
  resolve: {
    // This editor uses WASM only. The default entry also ships the much larger GPU runtime.
    alias: [{ find: /^onnxruntime-web$/, replacement: 'onnxruntime-web/wasm' }],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  optimizeDeps: {
    exclude: ['onnxruntime-web', 'onnxruntime-web/wasm'],
  },
  server: {
    proxy: {
      '/ChineseBQB/catalog': 'http://127.0.0.1:1313',
      '/ChineseBQB/media': 'http://127.0.0.1:1313',
      '/ChineseBQB/thumbs': 'http://127.0.0.1:1313',
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
