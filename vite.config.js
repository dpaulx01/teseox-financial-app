import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.PORT) || 3001,
    host: true,
    hmr: {
      overlay: false
    },
    watch: {
      ignored: [
        '**/backend/**',
        '**/database/**',
        '**/docker/**',
        '**/logs/**',
        '**/__pycache__/**',
        '**/uploads/**',
        '**/*.py',
        '**/*.csv',
        '**/*.xls',
        '**/*.xlsx'
      ]
    }
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'recharts',
      'lucide-react',
      'chart.js',
      'react-chartjs-2'
    ],
    exclude: ['framer-motion'],
    force: false,
    esbuildOptions: {
      mainFields: ['module', 'jsnext:main', 'jsnext', 'browser', 'main']
    }
  },
  resolve: {
    conditions: ['import', 'module', 'browser', 'default'],
    alias: {
      'framer-motion': path.resolve(__dirname, 'node_modules/framer-motion/dist/es/index.mjs')
    }
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Generar archivos con nombres más simples
    rollupOptions: {
      output: {
        // Nombres de archivos más compatibles con servidores compartidos
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
