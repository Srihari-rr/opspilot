import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [react(), tailwindcss(), ...(process.env.VITE_DEMO === '1' ? [viteSingleFile()] : [])],
  build: process.env.VITE_DEMO === '1' ? { outDir: 'dist-demo', assetsInlineLimit: 100000000, cssCodeSplit: false } : {},
  server: {
    fs: { allow: ['..'] },
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    proxy: { '/api': { target: 'http://localhost:5000', changeOrigin: true } },
  },
})
