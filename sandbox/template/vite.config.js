import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

const disableHmr = process.env.DISABLE_VITE_HMR === 'true'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    hmr: {
      clientPort: 80,
      protocol: 'ws',
    },
    watch: {
      usePolling: true,
      interval: 300,
      ignored: ['node_modules']
    }
  },
})
