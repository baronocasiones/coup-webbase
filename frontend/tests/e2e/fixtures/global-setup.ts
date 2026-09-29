import { request } from '@playwright/test';

/**
 * Warm the Vite dev server before the clock starts on any test.
 *
 * Vite serves modules by transforming them on first request. The very first
 * `page.goto('/')` in a cold run therefore pays for compiling the entire app
 * graph — router, query client, anime.js, the Discord SDK, every page and
 * component — and that cost lands inside whichever test happened to be first.
 * Measured on this repo, a cold `landing.spec.ts` ran at ~2s per test and the
 * same file at the end of a full suite ran at ~13-28s, with two tests crossing
 * the timeout purely because the server had never been asked for those modules.
 *
 * This does not touch application state: it is a bare GET of the entry
 * document, issued outside any test, so it cannot perturb the game singleton or
 * fail a test on its own. It only moves the transform cost out of the measured
 * window and out of the attribution.
 *
 * `webServer` has already started and passed its readiness probe by the time
 * globalSetup runs, so a failure here is a real problem and is surfaced as one.
 */
export default async function globalSetup(): Promise<void> {
  const url = process.env.E2E_BASE_URL || 'http://localhost:5173';

  // `request` is a factory, not a client — the only method it exposes is
  // `newContext()`. The context must be disposed or the run leaks a connection
  // pool for its whole duration.
  const context = await request.newContext();

  let lastError: unknown;
  try {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await context.get(url, { timeout: 60_000 });
        if (!res.ok()) {
          throw new Error(`GET ${url} returned ${res.status()}`);
        }
        return;
      } catch (err) {
        lastError = err;
        if (attempt < 3) {
          // Vite may still be binding/optimising deps on a cold start.
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    }
  } finally {
    await context.dispose();
  }

  throw new Error(
    `E2E globalSetup could not warm the dev server at ${url}: ${String(lastError)}`
  );
}
