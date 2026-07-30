import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Si on est sur GitHub Pages (repo SiteCB), on utilise '/SiteCB/', sinon './' pour OVH
  base: process.env.NODE_ENV === 'production' && process.env.GITHUB_ACTIONS ? '/SiteCB/' : './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  }
})