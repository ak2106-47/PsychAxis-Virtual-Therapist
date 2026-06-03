import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Forward API calls to the Flask backend during development so the
    // browser never sees the Groq key and there are no CORS headaches.
    proxy: {
      '/api': 'http://localhost:5003',
    },
  },
})
