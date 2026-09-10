import { test as base, expect } from '@playwright/test';

const API_BASE = 'http://localhost:8000';

/**
 * Extended test fixture that resets game state before each test.
 * This ensures test isolation despite the global game singleton.
 */
export const test = base.extend({
  // Auto-reset before each test
  page: async ({ page }, use) => {
    // Reset backend state
    await page.request.post(`${API_BASE}/test/reset`);
    await use(page);
  },
});

export { expect };
