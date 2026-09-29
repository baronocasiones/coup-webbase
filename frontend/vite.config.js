import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    css: false,
    // Unit tests live in src/__tests__. The Playwright specs under
    // tests/e2e match the default include glob, so without this vitest tries
    // to run them and every one fails with "Playwright Test did not expect
    // test() to be called here" — 12 phantom failures that have nothing to do
    // with the unit suite. Run those with `npx playwright test`.
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/setupTests.js', 'src/main.jsx'],
    },
  },
})
