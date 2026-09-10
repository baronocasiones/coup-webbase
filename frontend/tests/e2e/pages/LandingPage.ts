import { type Page, type Locator } from '@playwright/test';

/**
 * Page Object for the Landing page.
 */
export class LandingPage {
  readonly page: Page;
  readonly nameInput: Locator;
  readonly submitButton: Locator;
  readonly title: Locator;
  readonly subtitle: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameInput = page.locator('input[type="text"]');
    this.submitButton = page.locator('button:has-text("Join Game")');
    this.title = page.locator('h1');
    this.subtitle = page.locator('p');
  }

  async goto() {
    await this.page.goto('/');
    await this.nameInput.waitFor({ timeout: 10000 });
  }

  async enterName(name: string) {
    await this.nameInput.fill(name);
  }

  async submit() {
    await this.submitButton.click();
  }

  async joinGame(name: string) {
    await this.enterName(name);
    await this.submit();
  }

  async waitForLobby() {
    await this.page.waitForURL('**/lobby', { timeout: 10000 });
  }
}
