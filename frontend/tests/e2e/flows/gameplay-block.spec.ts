import { test, expect } from '../fixtures/test-base';
import { createPlayerAndJoin, setupAndStartGame, waitForWsConnected } from '../utils/game-flow';
import { getGameState, getUserPlayer } from '../utils/api-helpers';
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

    if (gameState.currentTurn?.id !== p1.userId) {
      // Bob opened the game, and this flow only exercises Alice's action bar.
      // Say so rather than falling through the assertions and reporting a pass
      // having checked nothing.
      test.skip(true, 'Bob opened the game; action bar belongs to Bob.');
      return;
    }

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

    if (gameState.currentTurn?.id !== p1.userId) {
      test.skip(true, 'Bob opened the game; this flow asserts on Alice\'s action bar.');
      return;
    }

    // Income is unblockable — it executes immediately
    await playRoom1.incomeButton.click();
    await page.waitForTimeout(2000);

    // Game should advance — no block/challenge window for income
    const newGameState = await getGameState(page);
    expect(newGameState.state).toBe('WAITING_FOR_ACTION');

    await context2.close();
  });
});

/**
 * Who is asked to respond once a block is declared.
 *
 * The rule inverts at that point. During ACTION_DECLARED it is everyone except
 * the player who declared the move; during BLOCK_DECLARED it is only that same
 * player, because whoever had their action blocked is the one who decides
 * whether the block stands. `currentTurn` cannot express that on its own — it
 * still names the blocked player, having not advanced — so the client has to be
 * told who blocked, and then must not offer the blocker a response.
 */
test.describe('Gameplay: block response routing', () => {
  test('BL-06: only the blocked player is asked to challenge the block', async ({ page, browser }) => {
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
    await waitForWsConnected(page);
    await waitForWsConnected(page2);

    const gameState = await getGameState(page);

    // Assert the precondition instead of branching around it. An `if` with no
    // `else` turns a real failure into a silent pass, and this whole file is
    // about who sees what — a test that quietly asserts nothing proves
    // nothing about it.
    expect(
      gameState.currentTurn?.id,
      'Alice joined first so she must hold the opening turn; if this fails the turn order assumption is wrong'
    ).toBe(p1.userId);

    // Alice declares Foreign Aid. Blockable, and it needs no card of her own.
    await playRoom1.foreignAidButton.click();
    await expect
      .poll(async () => (await getGameState(page)).state, { timeout: 10000 })
      .toBe('ACTION_DECLARED');

    // Bob blocks. The Block button is offered to every player regardless of
    // hand — declaring a block you cannot back is a legal bluff, resolved by
    // the challenge system — so this step does not depend on the deal.
    await expect
      .poll(async () => playRoom2.blockButton.isVisible().catch(() => false), { timeout: 10000 })
      .toBe(true);
    await playRoom2.blockButton.click();

    await expect
      .poll(async () => (await getGameState(page)).state, { timeout: 10000 })
      .toBe('BLOCK_DECLARED');

    // The server names the blocker, and the turn has not moved off Alice.
    const blocked = await getGameState(page);
    expect(blocked.blockerId).toBe(p2.userId);
    expect(blocked.currentTurn?.id).toBe(p1.userId);

    // Alice — whose action was blocked — gets the response.
    await expect
      .poll(async () => playRoom1.challengeBlockButton.isVisible().catch(() => false), { timeout: 10000 })
      .toBe(true);
    await expect(playRoom1.acceptBlockButton).toBeVisible();

    // Bob — who declared it — gets nothing. He may not challenge his own block,
    // and he must not be able to "Accept" it and resolve the whole action for
    // the table.
    await expect(playRoom2.challengeBlockButton).toHaveCount(0);
    await expect(playRoom2.acceptBlockButton).toHaveCount(0);
    await expect(playRoom2.challengeButton).toHaveCount(0);
    await expect(playRoom2.passButton).toHaveCount(0);

    await context2.close();
  });

  test('BL-07: the blocked player can accept the block and the turn advances', async ({ page, browser }) => {
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
    await waitForWsConnected(page);
    await waitForWsConnected(page2);

    expect((await getGameState(page)).currentTurn?.id).toBe(p1.userId);

    await playRoom1.foreignAidButton.click();
    await expect
      .poll(async () => (await getGameState(page)).state, { timeout: 10000 })
      .toBe('ACTION_DECLARED');

    await expect
      .poll(async () => playRoom2.blockButton.isVisible().catch(() => false), { timeout: 10000 })
      .toBe(true);
    await playRoom2.blockButton.click();

    await expect
      .poll(async () => playRoom1.acceptBlockButton.isVisible().catch(() => false), { timeout: 10000 })
      .toBe(true);
    await playRoom1.acceptBlockButton.click();

    // An unchallenged block stands: the action is cancelled and the turn moves
    // on, and the blocker reference is cleared with it.
    await expect
      .poll(async () => (await getGameState(page)).state, { timeout: 10000 })
      .toBe('WAITING_FOR_ACTION');
    expect((await getGameState(page)).blockerId).toBeNull();

    // Alice declared Foreign Aid and the block stood, so she is still on 2.
    expect(await getUserPlayer(page, p1.userId).then((p) => p.coins)).toBe(2);

    await context2.close();
  });
});
