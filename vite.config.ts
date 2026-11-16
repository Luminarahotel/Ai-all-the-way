import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The 3D chunk (three + r3f) and the motion chunk (gsap + lenis) are loaded
// with dynamic import(), so the entry chunk stays small.
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 2500,
    outDir: process.env.LUMO_OUT_DIR || 'dist',
  },
})
