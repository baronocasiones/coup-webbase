import { test, expect } from '../fixtures/test-base';
import { createPlayerAndJoin, setupAndStartGame, waitForWsConnected } from '../utils/game-flow';
import { getGameState } from '../utils/api-helpers';
import { PlayRoomPage } from '../pages/PlayRoomPage';

test.describe('Gameplay: blocks', () => {
  test('BL-01: foreign aid can be attempted and game progresses', async ({ page, browser }) => {
    const p1 = await createPlayerAndJoin(page, 'Alice');
    await page.waitForURL('**/lobby', { timeout: 10000 });

    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    const p2 = await createPlayerAndJoin(page2, 'Bob');
    await page2.waitForURL('**/lobby', { timeout: 10000 });

    await setupAndStartGame([page, page2], [p1.userId, p2.userId]);

    const playRoom1 = new PlayRoomPage(page);
    const playRoom2 = new PlayRoomPage(page2);
    await playRoom1.waitForLoad();
    await playRoom2.waitForLoad();

    // Ensure WS is connected on BOTH pages before performing actions
    await waitForWsConnected(page);
    await waitForWsConnected(page2);

    const gameState = await getGameState(page);

    if (gameState.currentTurn?.id === p1.userId) {
      // Foreign Aid is always available (no card needed)
      // It IS blockable by Duke, so this tests the block UI
      await playRoom1.foreignAidButton.click();

      // Poll Bob's page for the block/pass options to appear
      // (WS broadcast may take a moment to reach Bob and trigger a React Query refetch)
      let hasBlockOption = false;
      for (let i = 0; i < 20; i++) {
        await page2.waitForTimeout(500);
        hasBlockOption = await page2.locator('button').filter({ hasText: /Block|Pass/i }).first().isVisible().catch(() => false);
        if (hasBlockOption) break;
      }
      expect(hasBlockOption).toBeTruthy();
    }

    await context2.close();
  });

  test('BL-05: income executes immediately without challenge/block', async ({ page, browser }) => {
    const p1 = await createPlayerAndJoin(page, 'Alice');
    await page.waitForURL('**/lobby', { timeout: 10000 });

    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    const p2 = await createPlayerAndJoin(page2, 'Bob');
    await page2.waitForURL('**/lobby', { timeout: 10000 });

    await setupAndStartGame([page, page2], [p1.userId, p2.userId]);

    const playRoom1 = new PlayRoomPage(page);
    const playRoom2 = new PlayRoomPage(page2);
    await playRoom1.waitForLoad();
    await playRoom2.waitForLoad();

    const gameState = await getGameState(page);

    if (gameState.currentTurn?.id === p1.userId) {
      // Income is unblockable — it executes immediately
      await playRoom1.incomeButton.click();
      await page.waitForTimeout(2000);

      // Game should advance — no block/challenge window for income
      const newGameState = await getGameState(page);
      expect(newGameState.state).toBe('WAITING_FOR_ACTION');
    }

    await context2.close();
  });
});
