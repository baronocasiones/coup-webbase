import { test, expect } from '../fixtures/test-base';
import { createPlayerAndJoin, setupAndStartGame } from '../utils/game-flow';
import { getGameState, getUserPlayer } from '../utils/api-helpers';

test('DEBUG: check WS state on playroom', async ({ page, browser }) => {
  const p1 = await createPlayerAndJoin(page, 'Alice');
  await page.waitForURL('**/lobby', { timeout: 10000 });

  const context2 = await browser.newContext();
  const page2 = await context2.newPage();
  const p2 = await createPlayerAndJoin(page2, 'Bob');
  await page2.waitForURL('**/lobby', { timeout: 10000 });

  await setupAndStartGame([page, page2], [p1.userId, p2.userId]);

  // Check if __wsTrackerInstalled exists
  const hasTracker = await page.evaluate(() => !!(window as any).__wsTrackerInstalled);
  console.log('Has tracker:', hasTracker);

  const trackerState = await page.evaluate(() => {
    const instances = (window as any).__wsInstances || [];
    return instances.map((e: any) => ({
      url: e.url,
      readyState: e.ws.readyState,
      connected: e.connected,
    }));
  });
  console.log('WS tracker state (Alice):', JSON.stringify(trackerState));

  const trackerState2 = await page2.evaluate(() => {
    const instances = (window as any).__wsInstances || [];
    return instances.map((e: any) => ({
      url: e.url,
      readyState: e.ws.readyState,
      connected: e.connected,
    }));
  });
  console.log('WS tracker state (Bob):', JSON.stringify(trackerState2));

  // Check console errors
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  // Wait a bit and check WS state
  await page.waitForTimeout(3000);

  const trackerStateAfterWait = await page.evaluate(() => {
    const instances = (window as any).__wsInstances || [];
    return instances.map((e: any) => ({
      url: e.url,
      readyState: e.ws.readyState,
      connected: e.connected,
    }));
  });
  console.log('WS tracker state after 3s (Alice):', JSON.stringify(trackerStateAfterWait));

  // Check page URL and game state
  console.log('Alice URL:', page.url());
  const gameState = await getGameState(page);
  console.log('Game state:', gameState.state);
  console.log('Current turn:', gameState.currentTurn?.id);

  await context2.close();
});
