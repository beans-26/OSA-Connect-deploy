import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/",
  plugins: [
    react(),
    tailwindcss(),
    // `npm run dev:https` (mode "https"): the dev site over HTTPS with a self-signed certificate, so a phone on
    // the same Wi-Fi can use the camera (browsers only allow it on HTTPS pages, except localhost)
    ...(mode === 'https' ? [basicSsl()] : []),
  ],
  server: {
    // Allow ../shared (help-content.json is shared with the mobile app)
    fs: { allow: ['..'] },
    host: true, // Expose to local network (0.0.0.0)
    allowedHosts: ['floppy-seas-post.loca.lt', '.loca.lt'], // Allow localtunnel domains
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: true,
    allowedHosts: ['.loca.lt'],
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
}))
