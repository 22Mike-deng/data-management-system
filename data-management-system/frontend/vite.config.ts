/**
 * Vite 配置文件
 * @creator dzh
 * @created 2026-03-11
 * @updated 2026-03-14
 */
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// 是否为 Electron 构建模式
const isElectronBuild = process.env.BUILD_TARGET === 'electron'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  // Electron 构建时的特殊配置
  base: isElectronBuild ? './' : '/',
  build: isElectronBuild
    ? {
        // Electron 构建配置
        outDir: 'dist',
        assetsDir: 'assets',
        // 禁用内联动态导入，避免 Electron 加载问题
        inlineDynamicImports: false,
        rollupOptions: {
          output: {
            // 确保资源路径正确
            assetFileNames: 'assets/[name]-[hash][extname]',
            chunkFileNames: 'assets/[name]-[hash].js',
            entryFileNames: 'assets/[name]-[hash].js',
          },
        },
      }
    : {},
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // 静态资源代理（头像、文件等）
      '/static': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
