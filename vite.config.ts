import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [
      react({
        babel: {
          plugins: [['babel-plugin-react-compiler']],
        },
      }),
      tailwindcss(),
    ],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          // Use environment variable for proxy target, fallback to default
          target: env.VITE_API_BASE_URL?.replace('/api', '') || 'https://tconsolutions-64307221061.asia-south1.run.app',
          changeOrigin: true,
          secure: false,
          // The proxy will forward /api requests to the target
          // If you're using VITE_API_BASE_URL directly in the code, you may want to disable this proxy
          // or keep it for local development fallback
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }
})
