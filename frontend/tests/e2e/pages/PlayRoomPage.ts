import { type Page, type Locator } from '@playwright/test';

/**
 * Page Object for the PlayRoom page.
 */
export class PlayRoomPage {
  readonly page: Page;
  readonly currentTurnLabel: Locator;
  readonly turnName: Locator;
  readonly playersLeft: Locator;
  readonly cardsInDeck: Locator;
  readonly userCoins: Locator;
  readonly userCards: Locator;
  readonly opponents: Locator;
  readonly incomeButton: Locator;
  readonly foreignAidButton: Locator;
  readonly coupButton: Locator;
  readonly taxButton: Locator;
  readonly assassinateButton: Locator;
  readonly stealButton: Locator;
  readonly exchangeButton: Locator;
  readonly challengeButton: Locator;
  readonly passButton: Locator;
  readonly blockButton: Locator;
  readonly challengeBlockButton: Locator;
  readonly acceptBlockButton: Locator;
  readonly gameOverOverlay: Locator;

  constructor(page: Page) {
    this.page = page;
    this.currentTurnLabel = page.locator('label', { hasText: 'Current Turn' });
    this.turnName = page.locator('[class*="turnName"]');
    this.playersLeft = page.locator('text=Players Left').locator('..').locator('[class*="statValue"]');
    this.cardsInDeck = page.locator('text=Cards in Deck').locator('..').locator('[class*="statValue"]');
    this.userCoins = page.locator('[class*="userCoinValue"]');
    this.userCards = page.locator('[class*="userCardName"]');
    this.opponents = page.locator('[class*="playersContainer"] [class*="player"]');
    this.incomeButton = page.locator('button', { hasText: 'Income' });
    this.foreignAidButton = page.locator('button', { hasText: 'Foreign Aid' });
    this.coupButton = page.locator('button', { hasText: /Coup/ });
    this.taxButton = page.locator('button', { hasText: 'Tax' });
    this.assassinateButton = page.locator('button', { hasText: 'Assassinate' });
    this.stealButton = page.locator('button', { hasText: 'Steal' });
    this.exchangeButton = page.locator('button', { hasText: 'Exchange' });
    this.challengeButton = page.locator('button', { hasText: 'Challenge' });
    this.passButton = page.locator('button', { hasText: 'Pass' });
    this.blockButton = page.locator('button', { hasText: /Block/ }).first();
    this.challengeBlockButton = page.locator('button', { hasText: 'Challenge Block' });
    this.acceptBlockButton = page.locator('button', { hasText: 'Accept Block' });
    this.gameOverOverlay = page.locator('[class*="gameOverOverlay"]');
  }

  async waitForLoad() {
    await this.page.waitForSelector('[class*="header"]', { timeout: 10000 });
  }

  async performAction(action: string) {
    const button = this.page.locator('button', { hasText: action });
    await button.click();
  }

  async performTargetedAction(action: string) {
    const button = this.page.locator('button', { hasText: action });
    await button.click();
    // Wait for target selection modal
    await this.page.waitForSelector('[class*="playerTargetable"]', { timeout: 5000 });
  }

  async selectTarget(playerName: string) {
    const player = this.page.locator('[class*="playerTargetable"]', { hasText: playerName });
    await player.click();
  }

  async challenge() {
    await this.challengeButton.click();
  }

  async noChallenge() {
    await this.passButton.click();
  }

  async acceptBlock() {
    await this.acceptBlockButton.click();
  }

  async challengeBlock() {
    await this.challengeBlockButton.click();
  }

  /**
   * Card buttons in the exchange picker.
   *
   * Selected by accessible name, not by class. The CSS Module class names are
   * substring-ambiguous: `exchangeCard` prefixes `exchangeCards`,
   * `exchangeCardIcon` and `exchangeCardName`, so `[class*="exchangeCard"]`
   * matches the container plus two spans per button — 13 nodes for a
   * four-card pool. The buttons carry `aria-label="Select <CARD>"`.
   */
  get exchangeCardButtons(): Locator {
    return this.page.locator('[class*="exchangeModal"] button[aria-label^="Select "]');
  }

  /** The influences currently in the exchange pool, in picker order. */
  async getExchangeCardNames(): Promise<string[]> {
    return (await this.page.locator('[class*="exchangeCardName"]').allTextContents()).map((t) => t.trim());
  }

  async selectInfluence(card: string) {
    await this.exchangeCardButtons.filter({ hasText: card }).first().click();
  }

  /**
   * Select a card in the exchange picker by position.
   *
   * Position, not name: the court deck holds three of every influence, so a
   * pool containing a repeated card is routine and a name selector is
   * ambiguous. The pool is ordered hand-first, drawn-second.
   */
  async selectExchangeCardAt(index: number) {
    await this.exchangeCardButtons.nth(index).click();
  }

  async selectExchangeCards(cards: string[]) {
    for (const card of cards) {
      const cardButton = this.page.locator('[class*="exchangeCard"]', { hasText: card });
      await cardButton.click();
    }
    // Click confirm button
    const confirmButton = this.page.locator('button', { hasText: 'Confirm Selection' });
    await confirmButton.click();
  }

  async getUserCoins() {
    const text = await this.userCoins.textContent();
    return parseInt(text?.match(/\d+/)?.[0] || '0');
  }

  async getOpponentCount() {
    return await this.opponents.count();
  }

  async isGameOverVisible() {
    return await this.gameOverOverlay.isVisible();
  }
}
