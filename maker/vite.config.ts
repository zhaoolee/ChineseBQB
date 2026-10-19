import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { retryOcrImports } from './build/ocr-import-retry'

export default defineConfig({
  plugins: [react(), retryOcrImports()],
  base: '/ChineseBQB/maker/',
  resolve: {
    // This editor uses WASM only. The default entry also ships the much larger GPU runtime.
    alias: [{ find: /^onnxruntime-web$/, replacement: 'onnxruntime-web/wasm' }],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // One module instance shares ORT configuration with Paddle, including after a retried import.
        manualChunks: {
          preload: ['\0vite/preload-helper.js'],
          ocr: ['@paddleocr/paddleocr-js', 'onnxruntime-web/wasm'],
        },
      },
    },
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
