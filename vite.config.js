import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Utiliser './' garantit que les chemins des assets (JS, CSS, images) 
  // sont relatifs et fonctionnent parfaitement sur n'importe quel sous-dossier OVH.
  base: './', 
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  }
})