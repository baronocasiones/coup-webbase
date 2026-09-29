import { test, expect } from '../fixtures/test-base';
import { createPlayerAndJoin, setupAndStartGame } from '../utils/game-flow';
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
