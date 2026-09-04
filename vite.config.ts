import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 读取 .env / .env.development 等(含未以 VITE_ 开头的变量也读得到)
  const env = loadEnv(mode, '.', '')
  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    // 开发期代理:VITE_API_BASE 留空、设置 VITE_PROXY_TARGET 时,
    // 前端请求 /api/* 由 dev server 转发到后端,规避浏览器 CORS 限制
    server: env.VITE_PROXY_TARGET
      ? {
          // 强制 IPv4:默认 localhost 在 Windows 上可能只绑 ::1,IPv4 环境连不上
          host: '127.0.0.1',
          proxy: {
            '/api': {
              target: env.VITE_PROXY_TARGET,
              changeOrigin: true,
              // pinggy 免费隧道:不带此头会被警告页拦截,返回 HTML 而非 API JSON
              headers: { 'X-Pinggy-No-Screen': '1' },
            },
          },
        }
      : undefined,
  }
})
