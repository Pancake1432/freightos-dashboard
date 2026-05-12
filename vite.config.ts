import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Change '/freightos-dashboard/' to your actual GitHub repo name for deployment.
export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? '/freightos-dashboard/' : '/',
})
