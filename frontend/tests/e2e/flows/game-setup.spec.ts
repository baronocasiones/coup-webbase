import { test, expect } from '../fixtures/test-base';
import { createPlayerAndJoin, setupAndStartGame } from '../utils/game-flow';
import { getGameState } from '../utils/api-helpers';

test.describe('Game setup (Lobby -> PlayRoom)', () => {
  test('GS-01: start game navigates to playroom', async ({ page, browser }) => {
    // Create two players
    const p1 = await createPlayerAndJoin(page, 'Alice');
    await page.waitForURL('**/lobby', { timeout: 10000 });

    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    const p2 = await createPlayerAndJoin(page2, 'Bob');
    await page2.waitForURL('**/lobby', { timeout: 10000 });

    // Ready both, start game, navigate to playroom
    await setupAndStartGame([page, page2], [p1.userId, p2.userId]);

    expect(page.url()).toContain('/playroom');

    await context2.close();
  });
});
