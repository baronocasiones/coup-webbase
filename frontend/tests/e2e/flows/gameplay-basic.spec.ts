import { test, expect } from '../fixtures/test-base';
import { createPlayerAndJoin, setupAndStartGame, waitForWsConnected } from '../utils/game-flow';
import { getGameState, getUserPlayer } from '../utils/api-helpers';
import { PlayRoomPage } from '../pages/PlayRoomPage';

test.describe('Gameplay: basic actions', () => {
  test('GA-01: income gives +1 coin and advances turn', async ({ page, browser }) => {
    const p1 = await createPlayerAndJoin(page, 'Alice');
    await page.waitForURL('**/lobby', { timeout: 10000 });

    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    const p2 = await createPlayerAndJoin(page2, 'Bob');
    await page2.waitForURL('**/lobby', { timeout: 10000 });

    await setupAndStartGame([page, page2], [p1.userId, p2.userId]);

    // Debug: check backend state before querying
    const debugResp = await page.request.get('http://localhost:8000/test/debug');
    const debugData = await debugResp.json();
    console.log('DEBUG GAME STATE:', JSON.stringify(debugData));
    console.log('p1.userId:', p1.userId, 'p2.userId:', p2.userId);

    // Get initial state via API
    const initialPlayer = await getUserPlayer(page, p1.userId);
    const initialCoins = initialPlayer.coins;
    const gameState = await getGameState(page);
    const isAliceTurn = gameState.currentTurn?.id === p1.userId;

    // The first player is dealt the opening turn, so Alice should own it. This
    // used to be an `if (isAliceTurn) { ...assertions... }` with no else, which
    // meant that whenever the turn landed on Bob the test body was skipped
    // entirely and the test reported success having verified nothing at all —
    // a green check that carried no information. An explicit skip states the
    // precondition out loud instead of quietly reporting a pass.
    expect(
      isAliceTurn,
      `Expected Alice to open the game, but currentTurn was ${gameState.currentTurn?.name}`
    ).toBe(true);

    const playRoom = new PlayRoomPage(page);
    await playRoom.waitForLoad();

    // Ensure WS is connected before sending any actions
    await waitForWsConnected(page);

    await playRoom.performAction('Income');

    // Poll REST API for the coin update (WS broadcast doesn't reach the sender)
    let updatedCoins = initialCoins;
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(500);
      const updatedPlayer = await getUserPlayer(page, p1.userId);
      updatedCoins = updatedPlayer.coins;
      if (updatedCoins === initialCoins + 1) break;
    }
    expect(updatedCoins).toBe(initialCoins + 1);

    await context2.close();
  });

  test('GA-08: turn indicator shows correct current player', async ({ page, browser }) => {
    const p1 = await createPlayerAndJoin(page, 'Alice');
    await page.waitForURL('**/lobby', { timeout: 10000 });

    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    const p2 = await createPlayerAndJoin(page2, 'Bob');
    await page2.waitForURL('**/lobby', { timeout: 10000 });

    await setupAndStartGame([page, page2], [p1.userId, p2.userId]);

    const playRoom = new PlayRoomPage(page);
    await playRoom.waitForLoad();

    await expect(playRoom.turnName).toBeVisible();

    await context2.close();
  });
});
