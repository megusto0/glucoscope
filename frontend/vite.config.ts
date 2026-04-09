import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const backendPort = process.env.BACKEND_PORT ?? '8000'

export default defineConfig({
  base: '/app/',
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: ['megusto.duckdns.org'],
    proxy: {
      '/app/api': {
        target: `http://localhost:${backendPort}`,
        rewrite: (path) => path.replace(/^\/app\/api/, '/api'),
      },
    },
  },
})
