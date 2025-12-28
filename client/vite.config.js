import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        // Explicitly alias react to ensure single instance
        'react': path.resolve(__dirname, './node_modules/react'),
        'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
      },
      // Force single instance of React
      dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
    },
    server: {
      port: 5173,
      // Fix WebSocket/HMR issues
      hmr: {
        protocol: 'ws',
        host: 'localhost',
        port: 5173,
      },
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true
        }
      }
    },
    // Force re-optimization of dependencies
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react-router-dom',
        'react-hot-toast',
        'lucide-react',
        'firebase/app',
        'firebase/auth',
        'firebase/firestore',
        'framer-motion',
        'recharts',
        'date-fns',
        'zod'
      ],
      esbuildOptions: {
        jsx: 'automatic',
      }
    },
    build: {
      // Chunk size warning limit (500KB)
      chunkSizeWarningLimit: 500,
      // Enable source maps for error tracking in production
      sourcemap: mode === 'production' ? 'hidden' : true,
      rollupOptions: {
        output: {
          // Manual chunk splitting for better caching and performance
          manualChunks: {
            // Core React dependencies - rarely change
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            // Firebase SDK - large and stable
            'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
            // Charts library - large, loaded on dashboard
            'charts': ['recharts'],
            // Animations - smaller chunk
            'animations': ['framer-motion'],
            // Form handling and validation
            'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
            // Icons and utilities
            'ui-vendor': ['lucide-react', 'date-fns', 'clsx', 'tailwind-merge']
          }
        }
      }
    },
    // Define fallback values for environment variables
    define: {
      // Ensure env vars have fallbacks to prevent undefined errors
      '__APP_VERSION__': JSON.stringify(process.env.npm_package_version || '2.0.0'),
    }
  }
})
