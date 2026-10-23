const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 45_000,
  expect: { timeout: 12_000, toHaveScreenshot: { maxDiffPixelRatio: 0.08 } },
  snapshotPathTemplate: '{testDir}/snapshots/{arg}{ext}',
  use: { baseURL: 'http://127.0.0.1:8765', colorScheme: 'dark' },
  webServer: {
    command: 'python3 -m http.server 8765 --bind 127.0.0.1',
    url: 'http://127.0.0.1:8765',
    reuseExistingServer: true
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } }
  ]
});
