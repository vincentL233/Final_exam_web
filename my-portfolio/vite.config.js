import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    port: 3000,
    strictPort: true,
  },
  build: {
    chunkSizeWarningLimit: 1500, // 將警告限制調大到 1500kb (因為用到 Three.js)
    rollupOptions: {
      output: {
        manualChunks(id) {
          // 將 node_modules 中的程式碼單獨打包 (例如 three.js, gsap)
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  }
})
