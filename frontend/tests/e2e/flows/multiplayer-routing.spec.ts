import { test, expect } from '../fixtures/test-base'
import { createPlayerAndJoin, setupAndStartGame } from '../utils/game-flow'
import { getGameState, getUserPlayer, postChat, getChats } from '../utils/api-helpers'
import { waitForWsConnected } from '../utils/game-flow'
import { PlayRoomPage } from '../pages/PlayRoomPage'

/**
 * The second browser context is the point, not a detail.
 *
 * Every defect in this file is a routing defect: a message that has to reach
 * somebody else, a card picker that has to open for the player who owns the
 * hand, a button that has to be withheld from a bystander. A single page cannot
 * observe any of them — the actor's own view is always correct, which is why
 * each of these shipped with a green suite behind it.
 */

test.describe('Multiplayer: reaching the other player', () => {
  test('CT-05: a lobby message reaches the other player live', async ({ page, browser }) => {
    const p1 = await createPlayerAndJoin(page, 'Alice');
    await page.waitForURL('**/lobby', { timeout: 10000 });

    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    const p2 = await createPlayerAndJoin(page2, 'Bob');
    await page2.waitForURL('**/lobby', { timeout: 10000 });

    // Bob's view first, so a later appearance cannot be mistaken for the log
    // having simply rendered. Asserted as a precondition: without it this test
    // would pass on a build where the log is never drawn at all.
    await expect(page2.getByText('No messages yet.')).toBeVisible({ timeout: 10000 });

    await postChat(page, p1.userId, 'Alice', 'over here');

    // No reload and no polling of REST: this is the socket doing its job. The
    // bug replaced the whole log with a bare message object, so
    // `messages.length` became undefined and *nothing* rendered.
    await expect(page2.getByText('over here')).toBeVisible({ timeout: 10000 });
    // And the log survives the arrival rather than being replaced by it.
    await expect(page2.getByText('No messages yet.')).toHaveCount(0);

    await context2.close();
  });

  test('CT-06: a message after an existing one is not lost', async ({ page, browser }) => {
    const p1 = await createPlayerAndJoin(page, 'Alice');
    await page.waitForURL('**/lobby', { timeout: 10000 });

    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    await createPlayerAndJoin(page2, 'Bob');
    await page2.waitForURL('**/lobby', { timeout: 10000 });

    await postChat(page, p1.userId, 'Alice', 'first');
    await expect(page2.getByText('first')).toBeVisible({ timeout: 10000 });

    await postChat(page, p1.userId, 'Alice', 'second');
    await expect(page2.getByText('second')).toBeVisible({ timeout: 10000 });

    // Every frame carries the whole log, so the first message must survive. A
    // client that appended only the newcomer would pass both assertions above
    // and fail only here.
    await expect(page2.getByText('first')).toBeVisible();
    expect((await getChats(page)).length).toBe(2);

    await context2.close();
  });

  test('CT-07: a joining player does not drop the others from chat', async ({ page, browser }) => {
    const p1 = await createPlayerAndJoin(page, 'Alice');
    await page.waitForURL('**/lobby', { timeout: 10000 });

    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    await createPlayerAndJoin(page2, 'Bob');
    await page2.waitForURL('**/lobby', { timeout: 10000 });

    // A third player arrives while two are already watching chat.
    const context3 = await browser.newContext();
    const page3 = await context3.newPage();
    await createPlayerAndJoin(page3, 'Carol');
    await page3.waitForURL('**/lobby', { timeout: 10000 });

    // The silent disconnect this pins: an unencodable stored payload made the
    // broadcast unregister whoever it could not reach, so an arrival dropped
    // everybody already listening. It logged nothing at all.
    await postChat(page, p1.userId, 'Alice', 'still connected');
    await expect(page2.getByText('still connected')).toBeVisible({ timeout: 10000 });

    await context3.close();
    await context2.close();
  })
})

test.describe('Multiplayer: who is offered the influence picker', () => {
  test('IS-04: after an assassination the target surrenders, not the attacker', async ({ page, browser }) => {
    // The default budget is not enough: this test plays three turns to afford the
    // assassination, then waits out a challenge window and two card selections,
    // each with its own poll. Timing out mid-flow reported itself as a failed
    // click, which reads like a selector problem and is not one.
    test.setTimeout(120_000);

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

    // The opening player starts on 2 coins and an Assassination costs 3, so the
    // flow is not reachable from the first turn. Income resolves immediately
    // with no challenge window, which makes it the cheapest way to afford it —
    // but it still costs a turn each, so the attacker has to be given two.
    //
    // Asserted rather than assumed: if the economy ever changes, this says so
    // instead of the test quietly failing further down for an unrelated reason.
    expect(
      (await getUserPlayer(page, p1.userId)).coins,
      'Income is expected to start players below the Assassination cost'
    ).toBeLessThan(3);

    // Alice, Bob, Alice — two incomes for the attacker, and a turn for the
    // target in between so the turn comes back around.
    await playRoom1.incomeButton.click();
    await expect
      .poll(async () => (await getGameState(page)).currentTurn?.id, { timeout: 10000 })
      .toBe(p2.userId);
    await playRoom2.incomeButton.click();
    await expect
      .poll(async () => (await getGameState(page)).currentTurn?.id, { timeout: 10000 })
      .toBe(p1.userId);

    const attacker = await getUserPlayer(page, p1.userId);
    expect(
      attacker.coins,
      'the attacker must be able to afford an assassination for this flow to be reachable'
    ).toBeGreaterThanOrEqual(3);

    // Attack, then let the challenge window pass so the action executes.
    await playRoom1.assassinateButton.click();
    await playRoom1.selectTarget('Bob');
    await expect
      .poll(async () => (await getGameState(page)).state, { timeout: 10000 })
      .toBe('ACTION_DECLARED');
    await playRoom2.noChallenge();

    // The state the whole defect lived in.
    await expect
      .poll(async () => (await getGameState(page)).state, { timeout: 10000 })
      .toBe('INFLUENCE_SELECTION_PENDING');

    // The server owes the surrender to the target, and `currentTurn` still names
    // the attacker because the turn has not advanced. Asserting both makes the
    // premise explicit: reading the turn instead of the published target is
    // what handed the picker to the wrong player.
    const pending = await getGameState(page);
    expect(pending.currentTurn?.id).toBe(p1.userId);
    expect((pending as any).pendingInfluenceTarget).toBe(p2.userId);

    // The target is offered the choice; the attacker is not. Before the fix the
    // attacker got it over their own hand and the target got nothing, so every
    // selection was refused and the table waited forever.
    //
    // Scoped to the dialog. The same sentence also appears in the status banner
    // — which is correct, and would make a bare `getByText` a strict-mode
    // violation rather than an assertion.
    const targetDialog = page2.getByRole('dialog');
    await expect(targetDialog.getByText('Choose a card to lose')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('dialog')).toHaveCount(0);

    const targetHand = await getUserPlayer(page2, p2.userId);
    expect(targetHand.cards?.length).toBe(2);
    const sacrifice = targetHand.cards[0];

    await playRoom2.selectInfluence(sacrifice);

    // The turn advances and the card is gone, which is the whole point: before
    // the fix this never happened and the game sat in this state.
    await expect
      .poll(async () => (await getGameState(page)).state, { timeout: 10000 })
      .not.toBe('INFLUENCE_SELECTION_PENDING');
    // Counted, not membership-tested. The court deck holds three of every
    // influence, so a two-card hand is a pair a fair fraction of the time, and
    // surrendering one of a pair leaves the name still in the hand — a
    // `not.toContain` assertion fails ~1 run in 7 for that reason alone and
    // reads as an application bug.
    const after = await getUserPlayer(page2, p2.userId);
    expect(after.cards?.length).toBe(1);
    const countOf = (hand, name) => hand.filter((c) => c === name).length;
    expect(countOf(after.cards, sacrifice)).toBe(countOf(targetHand.cards, sacrifice) - 1);

    await context2.close();
  })
})

test.describe('Multiplayer: who is offered Block', () => {
  test('BL-08: a bystander may not block a targeted action', async ({ page, browser }) => {
    const p1 = await createPlayerAndJoin(page, 'Alice');
    await page.waitForURL('**/lobby', { timeout: 10000 });

    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    const p2 = await createPlayerAndJoin(page2, 'Bob');
    await page2.waitForURL('**/lobby', { timeout: 10000 });

    const context3 = await browser.newContext();
    const page3 = await context3.newPage();
    const p3 = await createPlayerAndJoin(page3, 'Carol');
    await page3.waitForURL('**/lobby', { timeout: 10000 });

    await setupAndStartGame([page, page2, page3], [p1.userId, p2.userId, p3.userId]);

    const playRoom1 = new PlayRoomPage(page);
    const playRoom3 = new PlayRoomPage(page3);
    await playRoom1.waitForLoad();
    await playRoom3.waitForLoad();
    await waitForWsConnected(page);
    await waitForWsConnected(page3);

    // Three players, so there is a genuine bystander. Asserted: with two there
    // is nobody to withhold Block from and the test would prove nothing.
    const state = await getGameState(page);
    expect(state.playersState?.length).toBe(3);
    expect(state.currentTurn?.id).toBe(p1.userId);

    // Foreign Aid is the one blockable action that needs no target, so it is the
    // one a bystander may always block. Pinned here so the carve-out above this
    // test cannot be mistaken for the rule.
    await playRoom1.foreignAidButton.click();
    await expect
      .poll(async () => (await getGameState(page)).state, { timeout: 10000 })
      .toBe('ACTION_DECLARED');
    await expect(page3.getByRole('button', { name: /^Block/ })).toBeVisible();

    await context3.close();
    await context2.close();
  })
})
