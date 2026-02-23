import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      include: ['**/*.jsx', '**/*.js', '**/*.tsx', '**/*.ts'],
    }),
  ],
  base: process.env.ELECTRON === 'true' ? './' : (process.env.GITHUB_ACTIONS ? '/sol-usdt-analyzer/' : '/'),
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    host: true
  },
  define: {
    global: 'globalThis'
  }
})
