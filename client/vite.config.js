import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  build: {
    // Chunk size warning limit (500KB)
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Core React dependencies - rarely change
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Firebase SDK - large and stable
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          // UI libraries - charts, animations
          'ui-vendor': ['framer-motion', 'recharts'],
          // Form handling and validation
          'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
          // Utilities
          'utils-vendor': ['date-fns', 'lucide-react']
        }
      }
    }
  }
})
