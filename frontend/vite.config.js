import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Port 80 so the app is reachable at http://careernova with no port suffix.
// The hostname itself comes from a hosts file entry added by setup_hostname.ps1.
const PORT = 80
const BRAND_HOST = 'careernova'
const BRAND_URL = `http://${BRAND_HOST}/`

function brandedUrlBanner() {
  return {
    name: 'career-nova-url-banner',
    configureServer(server) {
      const printUrls = server.printUrls.bind(server)
      server.printUrls = () => {
        printUrls()
        console.log(
          `  \x1b[32m➜\x1b[0m  \x1b[1mCareer Nova\x1b[0m: \x1b[36m${BRAND_URL}\x1b[0m`,
        )
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), brandedUrlBanner()],
  server: {
    // Bind every interface so a phone on the same Wi-Fi can open the app at
    // http://<this machine's LAN IP>. Vite prints that address on startup.
    host: true,
    port: PORT,
    strictPort: true,
    // The LAN address changes with DHCP, so accept any Host header. This is a
    // development server on a trusted network.
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
