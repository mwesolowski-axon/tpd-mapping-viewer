import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const projectDir = path.dirname(fileURLToPath(import.meta.url))
const excelJsBrowser = path.resolve(projectDir, 'node_modules/exceljs/dist/exceljs.min.js')

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the built site works from any path/subfolder on GitHub Pages
  base: './',
  plugins: [react()],
  resolve: {
    // exceljs "main" targets Node; the min bundle works in the browser + Vite dev.
    alias: {
      exceljs: excelJsBrowser,
    },
  },
  optimizeDeps: {
    include: ['exceljs'],
  },
})
