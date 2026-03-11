import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
    allowedHosts: true, // allow Cloudflare tunnel URLs (e.g. *.trycloudflare.com)
    proxy: {
      '/colyseus': {
        target: 'http://localhost:2567',
        changeOrigin: true,
        ws: true,
      },
      '/api': {
        target: 'http://localhost:2567',
        changeOrigin: true,
      },
    },
  },
})
