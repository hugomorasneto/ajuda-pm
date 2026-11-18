import { defineConfig, devices } from '@playwright/test'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export default defineConfig({
  testDir: '.',
  testMatch: 'release.spec.js',
  outputDir: join(tmpdir(), 'prodforge-release-e2e-' + process.pid),
  use: { baseURL: 'http://127.0.0.1:4177', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'celular', use: { ...devices['Pixel 7'], viewport: { width: 320, height: 740 } } },
  ],
  webServer: { command: 'npm run preview:release -- --port 4177', url: 'http://127.0.0.1:4177', reuseExistingServer: false },
})
