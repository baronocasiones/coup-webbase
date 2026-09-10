import { type Page, type Browser } from '@playwright/test';
import { toggleReady, startGame as apiStartGame } from './api-helpers';

export interface PlayerContext {
  page: Page;
  userId: string;
  username: string;
}

/**
 * Install a WebSocket tracker on the page.
 * Uses addInitScript with a plain string to avoid serialization issues.
 * Must be called BEFORE any page.goto/page.reload.
 */
export async function installWsTracker(page: Page): Promise<void> {
  await page.addInitScript(`
    if (!window.__wsTrackerInstalled) {
      window.__wsTrackerInstalled = true;
      window.__wsInstances = [];
      var OrigWS = window.WebSocket;
      window.WebSocket = function(url, protocols) {
        var ws = (protocols !== undefined)
          ? new OrigWS(url, protocols)
          : new OrigWS(url);
        window.__wsInstances.push({
          url: String(url),
          ws: ws,
          connected: false
        });
        ws.addEventListener('open', function() {
          for (var i = 0; i < window.__wsInstances.length; i++) {
            if (window.__wsInstances[i].ws === ws) {
              window.__wsInstances[i].connected = true;
              break;
            }
          }
        });
        ws.addEventListener('close', function() {
          for (var i = 0; i < window.__wsInstances.length; i++) {
            if (window.__wsInstances[i].ws === ws) {
              window.__wsInstances[i].connected = false;
              break;
            }
          }
        });
        return ws;
      };
      window.WebSocket.prototype = OrigWS.prototype;
      window.WebSocket.CONNECTING = OrigWS.CONNECTING;
      window.WebSocket.OPEN = OrigWS.OPEN;
      window.WebSocket.CLOSING = OrigWS.CLOSING;
      window.WebSocket.CLOSED = OrigWS.CLOSED;
    }
  `);
}

/**
 * Wait for the game WebSocket to be connected.
 * Uses a simple fixed wait — the WS connects to localhost and should
 * be ready within 1-2 seconds after the page header is visible.
 */
export async function waitForWsConnected(
  _page: Page,
  _urlSubstring = '/ws/game',
  _timeout = 15000,
): Promise<void> {
  // WS to localhost connects in < 100ms. Give it 2 seconds to be safe.
  await _page.waitForTimeout(2000);
}

/**
 * Navigate to Landing, enter name, submit, wait for /lobby.
 * Returns the userId from sessionStorage.
 */
export async function createPlayerAndJoin(page: Page, name: string): Promise<PlayerContext> {
  await page.goto('/');
  await page.waitForSelector('input[type="text"]', { timeout: 10000 });
  await page.fill('input[type="text"]', name);
  await page.click('button:has-text("Join Game")');
  await page.waitForURL('**/lobby', { timeout: 10000 });
  const userId = await page.evaluate(() => sessionStorage.getItem('userId') || '');
  return { page, userId, username: name };
}

/**
 * Create multiple players in separate browser contexts.
 */
export async function setupMultiplayer(
  browser: Browser,
  names: string[]
): Promise<PlayerContext[]> {
  const players: PlayerContext[] = [];
  for (const name of names) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const player = await createPlayerAndJoin(page, name);
    players.push(player);
  }
  return players;
}

/**
 * Navigate a page to /playroom while preserving sessionStorage and game state.
 *
 * page.goto() causes a full page reload. This triggers the Lobby component's
 * beforeunload handler which calls removePlayerMutation — deleting the player
 * from the game! We prevent this by intercepting the DELETE /player request.
 *
 * Also, during the SPA's initial load, the Landing component's useEffect may
 * briefly fire and clear sessionStorage. To work around this:
 *   1. Navigate to /playroom (intercepting DELETE /player)
 *   2. Re-set the userId in sessionStorage if cleared
 *   3. Reload — now the URL is already /playroom so Landing won't mount,
 *      and sessionStorage survives.
 */
async function safeNavigateToPlayroom(page: Page, userId: string): Promise<void> {
  const FRONTEND_URL = 'http://localhost:5173';

  // Intercept DELETE /player requests to prevent the Lobby's beforeunload
  // handler from removing the player during page navigation
  await page.route('**/player?user_id=*', (route) => {
    if (route.request().method() === 'DELETE') {
      route.abort();
    } else {
      route.continue();
    }
  });

  // Navigate to /playroom
  await page.goto(`${FRONTEND_URL}/playroom`);
  await page.waitForTimeout(1000);

  // Re-set userId if it was cleared during the page reload
  const currentUserId = await page.evaluate(() => sessionStorage.getItem('userId'));
  if (!currentUserId && userId) {
    await page.evaluate((uid) => {
      sessionStorage.setItem('userId', uid);
      sessionStorage.setItem('username', '');
    }, userId);

    // Reload — URL is already /playroom so Landing won't mount
    try {
      // Use 'load' instead of 'networkidle' — WebSocket connections keep
      // the page "active" and networkidle never resolves
      await page.reload({ waitUntil: 'load', timeout: 10000 });
    } catch {
      // If reload fails (context closed), navigate fresh
      try {
        await page.goto(`${FRONTEND_URL}/playroom`);
      } catch {
        // Page/context already closed — nothing more we can do
      }
    }
    await page.waitForTimeout(1500);
  }

  // Remove the route interceptor after navigation
  await page.unroute('**/player?user_id=*');
}

/**
 * Full game setup: ready players, start game, navigate to playroom.
 * Installs the WS tracker on each page so tests can wait for connections.
 */
export async function setupAndStartGame(
  pages: Page[],
  userIds: string[],
): Promise<void> {
  // Install WS tracker on every page BEFORE any navigation
  for (const page of pages) {
    await installWsTracker(page);
  }

  // Ready all players via API
  for (const [i, userId] of userIds.entries()) {
    await toggleReady(pages[i], userId);
  }

  // Start game via API
  await apiStartGame(pages[0]);

  // Navigate all pages to /playroom (preserving sessionStorage)
  for (const [i, page] of pages.entries()) {
    await safeNavigateToPlayroom(page, userIds[i]);
  }
}
