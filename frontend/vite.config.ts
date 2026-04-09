import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/app/',
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: ['megusto.duckdns.org'],
    proxy: {
      '/app/api': {
        target: 'http://localhost:8000',
        rewrite: (path) => path.replace(/^\/app\/api/, '/api'),
      },
    },
  },
})
