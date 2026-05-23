import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables from .env files
  const env = loadEnv(mode, process.cwd(), '')

  // For GitHub Pages, the base path must match your repository name.
  // e.g. repo at github.com/yourname/fifadashboard → base = '/fifadashboard/'
  // Set BASE_PATH in your .env or GitHub Actions to override.
  const BASE = env.BASE_PATH || (mode === 'production' ? '/fifadashboard/' : '/')

  return {
    plugins: [react()],
    base: BASE,
    build: {
      outDir: 'dist',
      emptyOutDir: true
    }
  }
})
