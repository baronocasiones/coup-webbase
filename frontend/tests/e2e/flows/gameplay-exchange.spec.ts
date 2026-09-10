import { test, expect } from '../fixtures/test-base';
import { createPlayerAndJoin, setupAndStartGame } from '../utils/game-flow';
import { getGameState, getUserPlayer } from '../utils/api-helpers';
import { PlayRoomPage } from '../pages/PlayRoomPage';

test.describe('Gameplay: exchange', () => {
  test('GT-05: exchange requires Ambassador card', async ({ page, browser }) => {
    const p1 = await createPlayerAndJoin(page, 'Alice');
    await page.waitForURL('**/lobby', { timeout: 10000 });

    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    const p2 = await createPlayerAndJoin(page2, 'Bob');
    await page2.waitForURL('**/lobby', { timeout: 10000 });

    await setupAndStartGame([page, page2], [p1.userId, p2.userId]);

    const playRoom1 = new PlayRoomPage(page);
    await playRoom1.waitForLoad();

    // Verify the Exchange button is disabled when player doesn't have Ambassador
    const userPlayer = await getUserPlayer(page, p1.userId);
    const hasAmbassador = userPlayer.cards?.includes('AMBASSADOR');

    if (!hasAmbassador) {
      // Exchange button should be disabled (no Ambassador card)
      const isDisabled = await playRoom1.exchangeButton.isDisabled();
      expect(isDisabled).toBe(true);
    }

    await context2.close();
  });
});
