import { test, expect } from '../fixtures/test-base';
import { createPlayerAndJoin, setupAndStartGame } from '../utils/game-flow';
import { getGameState } from '../utils/api-helpers';

test.describe('Multiplayer', () => {
  test('MP-01: 2 players can start and play a game', async ({ page, browser }) => {
    const p1 = await createPlayerAndJoin(page, 'Alice');
    await page.waitForURL('**/lobby', { timeout: 10000 });

    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    const p2 = await createPlayerAndJoin(page2, 'Bob');
    await page2.waitForURL('**/lobby', { timeout: 10000 });

    await setupAndStartGame([page, page2], [p1.userId, p2.userId]);

    // Verify game state
    const gameState = await getGameState(page);
    expect(gameState.playersState.length).toBe(2);
    expect(gameState.state).toBe('WAITING_FOR_ACTION');

    await context2.close();
  });

  test('MP-06: each player sees only their own cards', async ({ page, browser }) => {
    const p1 = await createPlayerAndJoin(page, 'Alice');
    await page.waitForURL('**/lobby', { timeout: 10000 });

    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    const p2 = await createPlayerAndJoin(page2, 'Bob');
    await page2.waitForURL('**/lobby', { timeout: 10000 });

    await setupAndStartGame([page, page2], [p1.userId, p2.userId]);

    // Get user player details for each
    const { getUserPlayer } = await import('../utils/api-helpers');
    const alicePlayer = await getUserPlayer(page, p1.userId);
    const bobPlayer = await getUserPlayer(page2, p2.userId);

    // Each should have 2 cards
    expect(alicePlayer.cards.length).toBe(2);
    expect(bobPlayer.cards.length).toBe(2);

    // Verify correct player IDs
    expect(alicePlayer.id).toBe(p1.userId);
    expect(bobPlayer.id).toBe(p2.userId);

    await context2.close();
  });
});
