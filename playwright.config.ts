import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests',
  timeout: 240_000,
  workers: 1,
  fullyParallel: false,
  reporter: [['list'], ['json', { outputFile: 'test-results/results.json' }]],
  use: {
    baseURL: 'http://localhost:4173',
    headless: true,
    viewport: { width: 1440, height: 900 },
    launchOptions: { args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] },
  },
  webServer: [
    {
      // production build + preview (no waitlist endpoint: demo state)
      command: 'npm run build && npm run preview',
      url: 'http://localhost:4173',
      reuseExistingServer: true,
      timeout: 300_000,
    },
    {
      // second build with VITE_WAITLIST_URL=/api/waitlist, used only by the form gate
      command: 'node scripts/build-mock.mjs && node node_modules/vite/bin/vite.js preview --outDir dist-mock --port 4174 --strictPort',
      url: 'http://localhost:4174',
      reuseExistingServer: true,
      timeout: 300_000,
    },
  ],
})
