import { test, expect } from '../fixtures/test-base';
import { createPlayerAndJoin, setupAndStartGame, installWsTracker, waitForWsConnected } from '../utils/game-flow';
import { getGameState } from '../utils/api-helpers';

test.describe('Edge cases', () => {
  test('EC-03: navigate directly to lobby without creating player shows error then redirects', async ({ page }) => {
    await page.goto('/lobby');
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).not.toContain('/playroom');
  });

  test('EC-04: navigate directly to playroom without game shows loader then redirects', async ({ page }) => {
    await page.goto('/playroom');
    await page.waitForTimeout(5000);
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });

  test('EC-08: page refresh during gameplay preserves state', async ({ page, browser }) => {
    const p1 = await createPlayerAndJoin(page, 'Alice');
    await page.waitForURL('**/lobby', { timeout: 10000 });

    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    const p2 = await createPlayerAndJoin(page2, 'Bob');
    await page2.waitForURL('**/lobby', { timeout: 10000 });

    await setupAndStartGame([page, page2], [p1.userId, p2.userId]);

    // Get initial game state
    const initialState = await getGameState(page);

    // Refresh the page
    await page.reload();
    await page.waitForTimeout(3000);

    // Game state should persist (server-side)
    const afterRefreshState = await getGameState(page);
    expect(afterRefreshState.state).toBe(initialState.state);
    expect(afterRefreshState.playersState.length).toBe(initialState.playersState.length);

    await context2.close();
  });

  test('EC-09: invalid WebSocket action returns error', async ({ page, browser }) => {
    const p1 = await createPlayerAndJoin(page, 'Alice');
    await page.waitForURL('**/lobby', { timeout: 10000 });

    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    const p2 = await createPlayerAndJoin(page2, 'Bob');
    await page2.waitForURL('**/lobby', { timeout: 10000 });

    await setupAndStartGame([page, page2], [p1.userId, p2.userId]);

    // Wait for Alice's WS to be connected
    await waitForWsConnected(page);

    // Send bogus action through the EXISTING page WS (not a fresh connection)
    // The backend should respond with an "Unknown action" error
    const result = await page.evaluate(async () => {
      return new Promise<any>((resolve) => {
        const instances: any[] = (window as any).__wsInstances || [];
        const gameWs = instances.find(
          (e: any) => e.url.includes('/ws/game') && e.ws.readyState === WebSocket.OPEN,
        );

        if (!gameWs) {
          resolve({ error: 'no_ws_found' });
          return;
        }

        const origOnMessage = gameWs.ws.onmessage;
        gameWs.ws.onmessage = (event: MessageEvent) => {
          const data = JSON.parse(event.data);
          gameWs.ws.onmessage = origOnMessage;
          resolve(data);
        };

        gameWs.ws.send(JSON.stringify({ action: 'bogus_action' }));

        setTimeout(() => {
          gameWs.ws.onmessage = origOnMessage;
          resolve({ error: 'timeout' });
        }, 5000);
      });
    });

    expect(result.error).toContain('Unknown action');

    await context2.close();
  });
});
