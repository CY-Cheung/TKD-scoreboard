import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/TKD-scoreboard/', // 跟你的 repo 名稱完全一致（注意大小寫）
})
