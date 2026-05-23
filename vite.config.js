import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Replace with your actual repo name for GitHub Pages
// e.g. if your repo is github.com/yourname/fifadashboard, use '/fifadashboard/'
const BASE = process.env.NODE_ENV === 'production' ? '/fifadashboard/' : '/'

export default defineConfig({
  plugins: [react()],
  base: BASE,
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
