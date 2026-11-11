
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// `host: true` lets a tablet on the same wifi open the laptop's dev/preview server.
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  server: { host: true },
  preview: { host: true },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          motion: ['framer-motion'],
        },
      },
    },
  },
})
