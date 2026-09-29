import { test, expect } from '../fixtures/test-base';
import { createPlayerAndJoin, setupAndStartGame, waitForWsConnected } from '../utils/game-flow';
import { getGameState, getUserPlayer } from '../utils/api-helpers';
import { PlayRoomPage } from '../pages/PlayRoomPage';

test.describe('Gameplay: exchange', () => {
  // Bluffing is always legal in Coup, and this app enforces that: declaring
  // Exchange without an Ambassador is not blocked by the UI, it is punished
  // later by the challenge system if the bluff is called.
  //
  // This test used to assert the opposite — that the Exchange button is
  // `disabled` when the hand holds no Ambassador — which was true before the
  // bluffing fix removed the `hasCard()` gate from the action buttons. It had
  // been failing on that stale expectation ever since, and only when the
  // 2-card deal happened to omit the Ambassador; on the other deals it skipped
  // its own body and passed having asserted nothing. Both outcomes were wrong.
  //
  // The rule is now asserted unconditionally, and the bluff affordance is
  // checked against whatever the hand actually is, so neither branch is
  // vacuous.
  test('GT-05: exchange is always offered and flagged as a bluff without an Ambassador', async ({
    page,
    browser,
  }) => {
    const p1 = await createPlayerAndJoin(page, 'Alice');
    await page.waitForURL('**/lobby', { timeout: 10000 });

    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    const p2 = await createPlayerAndJoin(page2, 'Bob');
    await page2.waitForURL('**/lobby', { timeout: 10000 });

    await setupAndStartGame([page, page2], [p1.userId, p2.userId]);

    const playRoom1 = new PlayRoomPage(page);
    await playRoom1.waitForLoad();

    const isAliceTurn = (await getGameState(page)).currentTurn?.id === p1.userId;

    if (!isAliceTurn) {
      // Bob opened the game. This flow only asserts on the acting player's
      // action bar, so say so out loud rather than silently passing.
      test.skip(true, 'Bob opened the game; action bar belongs to Bob.');
      return;
    }

    const userPlayer = await getUserPlayer(page, p1.userId);
    const hasAmbassador = (userPlayer.cards || []).includes('AMBASSADOR');

    // Core rule, asserted on every deal: lacking the card never disables the
    // action. This is what the old test got backwards.
    await expect(playRoom1.exchangeButton).toBeEnabled();

    if (hasAmbassador) {
      // Genuine action — no bluff affordance.
      await expect(playRoom1.exchangeButton.locator('text=Bluff')).toHaveCount(0);
    } else {
      // Bluff — offered, but labelled so the player can see the risk.
      await expect(playRoom1.exchangeButton.locator('text=Bluff')).toHaveCount(1);
      await expect(playRoom1.exchangeButton).toHaveAttribute(
        'title',
        /You don't hold an Ambassador/
      );
    }

    await context2.close();
  });
});

/**
 * The exchange round trip.
 *
 * GT-05 above checks that the Exchange *button* is offered. That was the whole
 * of the coverage for a flow that could not complete: the picker read its pool
 * from a `gameState.exchangeCards` field the backend has never sent, so the
 * fallback handed the player their own hand back ("You drew 0 cards", one
 * selectable card), and the name the modal submitted was `card + index`, which
 * the server could not resolve. The error came back as a WebSocket frame the
 * client only `console.error`s, so the game sat in PENDING_EXCHANGE forever and
 * nothing reported it.
 *
 * This drives the flow to its end and asserts the hand actually changed.
 */
test.describe('Gameplay: exchange round trip', () => {
  test('GT-06: the drawn cards are shown, chosen, and swapped into the hand', async ({
    page,
    browser,
  }) => {
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

    // Precondition, asserted rather than branched around: an `if` with no
    // `else` would turn a turn-order surprise into a silent pass.
    expect(
      (await getGameState(page)).currentTurn?.id,
      'Alice joined first so she must hold the opening turn'
    ).toBe(p1.userId);

    const before = await getUserPlayer(page, p1.userId);
    const handSize = before.cards.length;
    expect(handSize).toBeGreaterThan(0);

    // --- declare -------------------------------------------------------
    await playRoom1.exchangeButton.click();
    await expect
      .poll(async () => (await getGameState(page)).state, { timeout: 10000 })
      .toBe('ACTION_DECLARED');

    // --- Bob passes, so the draw happens --------------------------------
    await expect
      .poll(async () => playRoom2.passButton.isVisible().catch(() => false), { timeout: 10000 })
      .toBe(true);
    await playRoom2.passButton.click();

    await expect
      .poll(async () => (await getGameState(page)).state, { timeout: 10000 })
      .toBe('PENDING_EXCHANGE');

    // --- the pool arrives, and it is bigger than the hand -----------------
    const pending = await getUserPlayer(page, p1.userId);
    expect(pending.exchangeCards, 'the drawn cards must reach the exchanging player').not.toBeNull();
    expect(pending.exchangeCards).toHaveLength(handSize + 2);
    // The opponent must not learn what was drawn.
    expect((await getUserPlayer(page2, p2.userId)).exchangeCards).toBeNull();

    // And the screen says so. "You drew 0 cards" is the exact symptom of the
    // pool falling back to the hand.
    const modal = page.locator('[class*="exchangeModal"]');
    await expect(modal).toBeVisible();
    await expect(modal.locator('text=/You drew 2 cards/')).toBeVisible();
    await expect(modal.locator(`text=/Select ${handSize} to keep/`)).toBeVisible();
    await expect(playRoom1.exchangeCardButtons).toHaveCount(handSize + 2);

    // --- keep the two freshly drawn cards ---------------------------------
    // The pool is hand-first, drawn-second, so the last two entries are the
    // ones off the deck.
    const pool = pending.exchangeCards as string[];
    const drawn = pool.slice(handSize);

    // Selected by position, so a repeated influence in the pool is unambiguous.
    for (let i = handSize; i < pool.length; i++) {
      await playRoom1.selectExchangeCardAt(i);
    }
    await expect(modal.locator('text=/' + handSize + ' \\/ ' + handSize + ' selected/')).toBeVisible();
    await page.locator('button', { hasText: 'Confirm Selection' }).click();

    // --- and the game moves on -------------------------------------------
    await expect
      .poll(async () => (await getGameState(page)).state, { timeout: 10000 })
      .toBe('WAITING_FOR_ACTION');

    // The real assertion: the hand is not what it was, and it is the two drawn
    // cards that survived. A flow that stayed stuck in PENDING_EXCHANGE would
    // still be showing the old hand here.
    const after = await getUserPlayer(page, p1.userId);
    expect(after.cards).toHaveLength(handSize);
    expect(after.cards).toEqual(drawn);
    expect(after.exchangeCards).toBeNull();

    // The picker is closed, and the board reflects the swap.
    await expect(modal).toHaveCount(0);
    await expect
      .poll(async () => playRoom1.userCards.allTextContents(), { timeout: 10000 })
      .toEqual(drawn);

    // The turn passed to Bob, which is the other half of "it is not stuck".
    expect((await getGameState(page)).currentTurn?.id).toBe(p2.userId);

    await context2.close();
  });
});
