import { test as base, expect } from '@playwright/test';

const API_BASE = 'http://localhost:8000';

/**
 * Extended test fixture that resets game state before each test.
 * This ensures test isolation despite the global game singleton.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    // Reset backend state.
    //
    // This used to be a bare `await page.request.post(...)` with the result
    // discarded. That is worse than useless: the global game singleton means a
    // skipped reset does not merely weaken the current test, it silently hands
    // every later test the previous test's players, turn order and deck, which
    // surfaces as a shifting, unreproducible set of failures that look like
    // application flakiness.
    //
    // /test/reset answers 403 unless the backend was started with ENV=testing,
    // which is exactly the mistake a reused local server makes. A hard failure
    // names the cause instead of letting it masquerade as a flaky test.
    const response = await page.request.post(`${API_BASE}/test/reset`);

    if (!response.ok()) {
      throw new Error(
        `E2E fixture could not reset game state: POST ${API_BASE}/test/reset ` +
          `returned ${response.status()}.\n` +
          `The backend only allows this endpoint when ENV=testing. ` +
          `Start it with: ENV=testing uvicorn api:app --port 8000\n` +
          (process.env.CI
            ? `This is unexpected in CI — playwright.config.ts sets ENV=testing ` +
              `on its webServer, so the backend is probably not the one this ` +
              `request reached.`
            : `If a server is already listening on port 8000 and Playwright ` +
              `reused it (reuseExistingServer), that server was probably ` +
              `started without ENV=testing. Restart it with the flag above.`)
      );
    }

    await use(page);
  },
});

export { expect };
