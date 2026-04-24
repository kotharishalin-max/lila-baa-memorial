import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Using default base '/' for now; flip to '/lila-baa-memorial/' when deploying to gh-pages
// default github.io subpath, or keep '/' if a custom domain is configured.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? '/',
})
