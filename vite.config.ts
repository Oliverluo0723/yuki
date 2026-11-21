/// <reference types="vitest/config" />
import basicSsl from '@vitejs/plugin-basic-ssl';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  // 手機要 https 才讀得到姿態；host: true 讓同一個 Wi-Fi 的手機連得進來。
  // pnpm dev:http（--mode http）改用 http，只在這台電腦的 localhost 上看，沒有憑證警告。
  plugins: mode === 'http' ? [] : [basicSsl()],
  server: { host: true },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}));
