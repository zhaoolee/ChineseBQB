import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/ChineseBQB/maker/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
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
