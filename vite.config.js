import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/TKD-scoreboard/', // 跟你的 repo 名稱完全一致（注意大小寫）
  server: {
    // Cursor Cloud / VM preview hosts (e.g. *.cursorvm.com)
    allowedHosts: ['.cursorvm.com', '.agent.cvm.dev', 'localhost'],
  },
  preview: {
    allowedHosts: ['.cursorvm.com', '.agent.cvm.dev', 'localhost'],
  },
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    // Emulator suite needs `npm run test:rules` (firebase emulators:exec).
    exclude: [
      'node_modules/**',
      'dist/**',
      'src/**/*.emulator.test.{js,jsx}',
    ],
  },
})
