import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e/flows',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'html',
  // Most flows drive two real browser contexts through a full game start
  // (join lobby -> ready -> start -> navigate -> open WebSocket). 30s left
  // almost no headroom: the same tests that pass in 14s in isolation drifted
  // to 30-33s once the suite had been running for a few minutes, and the
  // resulting timeouts failed on whichever test happened to cross the line
  // rather than on anything real. 60s absorbs the drift without weakening any
  // assertion — a genuinely broken action still fails, just on its own terms.
  timeout: 60000,

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  // Pull the first request's module-graph transform out of the measured window.
  // See tests/e2e/fixtures/global-setup.ts for the measurement behind it.
  globalSetup: './tests/e2e/fixtures/global-setup.ts',

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Playwright owns both servers.
  //
  // The CI workflow used to start uvicorn and Vite itself and then hand off to
  // `npx playwright test`. Because `reuseExistingServer` is false when CI is
  // set, Playwright then tried to start its *own* copies on the same two
  // already-bound ports and aborted before a single test ran:
  //
  //   Error: http://localhost:8000/players is already used, make sure that
  //   nothing is running on the port/url or set reuseExistingServer:true
  //
  // That is why the committed test-results/.last-run.json recorded
  // {"status":"failed","failedTests":[]} — an empty failure list, because the
  // abort happens during webServer startup, not during a test. Letting this
  // block own the servers removes the double-start, and the `url` readiness
  // probes below give a better error than a bare port check.
  //
  // `reuseExistingServer` stays on for local runs so a developer already
  // running `npm run dev` is not fought with. test-base.ts now hard-fails if
  // /test/reset is rejected, so a reused backend started without ENV=testing
  // reports that fact instead of silently running every test against
  // un-reset state.
  webServer: [
    {
      command: 'cd ../backend && uvicorn api:app --reload --port 8000',
      url: 'http://localhost:8000/players',
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
      // Without this, /test/reset returns 403 and every test silently runs
      // against whatever the previous test left behind. Must match the
      // ENV=testing that .github/workflows/e2e.yml no longer sets itself.
      env: { ENV: 'testing' },
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
      env: { API_URL: 'http://localhost:8000' },
    },
  ],
});
