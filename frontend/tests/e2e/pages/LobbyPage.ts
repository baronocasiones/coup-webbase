import { type Page, type Locator } from '@playwright/test';

/**
 * Page Object for the Lobby page.
 */
export class LobbyPage {
  readonly page: Page;
  readonly playerList: Locator;
  readonly readyButton: Locator;
  readonly startGameButton: Locator;
  readonly leaveButton: Locator;
  readonly chatInput: Locator;
  readonly chatSendButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.playerList = page.locator('[class*="playerList"] [class*="player"]');
    this.readyButton = page.locator('button:has-text("Ready")');
    this.startGameButton = page.locator('button:has-text("Start Game")');
    this.leaveButton = page.locator('button:has-text("Leave Lobby")');
    this.chatInput = page.locator('input[placeholder*="message"], textarea[placeholder*="message"]');
    this.chatSendButton = page.locator('button', { hasText: /send/i });
  }

  async getPlayerCount() {
    return await this.playerList.count();
  }

  async toggleReady() {
    await this.readyButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.readyButton.click();
  }

  async startGame() {
    await this.startGameButton.click();
    await this.page.waitForURL('**/playroom', { timeout: 10000 });
  }

  async sendMessage(text: string) {
    await this.chatInput.fill(text);
    await this.chatSendButton.click();
  }

  async isStartGameVisible() {
    return await this.startGameButton.isVisible();
  }

  async isReadyButtonVisible() {
    return await this.readyButton.isVisible();
  }

  async waitForPlayerCount(count: number, timeout: number = 5000) {
    await this.page.waitForFunction(
      (expectedCount) => {
        const players = document.querySelectorAll('[class*="playerList"] [class*="player"]');
        return players.length >= expectedCount;
      },
      count,
      { timeout }
    );
  }
}
