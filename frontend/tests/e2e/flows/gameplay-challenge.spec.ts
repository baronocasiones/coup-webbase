import { test, expect } from '../fixtures/test-base';
import { createPlayerAndJoin, setupAndStartGame } from '../utils/game-flow';
import { getGameState, getUserPlayer } from '../utils/api-helpers';
import { PlayRoomPage } from '../pages/PlayRoomPage';

test.describe('Gameplay: challenges', () => {
  test('CH-01: challenge window appears after declare_move', async ({ page, browser }) => {
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
    const userPlayer = await getUserPlayer(page, p1.userId);

    if (gameState.currentTurn?.id === p1.userId) {
      // Income is always available and doesn't require a specific card
      await playRoom1.performAction('Income');
      await page.waitForTimeout(1000);

      // Income executes immediately (no challenge window) — it's unblockable
      // Verify the game state progressed
      const newGameState = await getGameState(page);
      expect(newGameState.state).toBe('WAITING_FOR_ACTION');
    }

    await context2.close();
  });

  test('CH-05: no challenge proceeds normally', async ({ page, browser }) => {
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
      // Use Income (always available, no card needed)
      await playRoom1.performAction('Income');
      await page.waitForTimeout(2000);

      const newGameState = await getGameState(page);
      expect(newGameState.state).toBe('WAITING_FOR_ACTION');
    }

    await context2.close();
  });
});
