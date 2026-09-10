import { test, expect } from '../fixtures/test-base';
import { LandingPage } from '../pages/LandingPage';

test.describe('Landing page', () => {
  test('L-01: page loads and shows player name input', async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();
    await expect(landing.title).toHaveText('Coup');
    await expect(landing.nameInput).toBeVisible();
    await expect(landing.submitButton).toBeVisible();
  });

  test('L-02: submit with empty name prevents submission', async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();
    // Try to submit without entering a name
    await landing.submit();
    // Should stay on landing page
    expect(page.url()).toContain('/');
  });

  test('L-03: submit with valid name creates player and navigates to lobby', async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();
    await landing.joinGame('Alice');
    await landing.waitForLobby();
    expect(page.url()).toContain('/lobby');
  });

  test('L-04: sessionStorage contains userId and username after submit', async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();
    await landing.joinGame('Alice');
    await landing.waitForLobby();

    const userId = await page.evaluate(() => sessionStorage.getItem('userId'));
    const username = await page.evaluate(() => sessionStorage.getItem('username'));

    expect(userId).toBeTruthy();
    expect(username).toBe('Alice');
  });

  test('L-05: page loads within 5 seconds', async ({ page }) => {
    const start = Date.now();
    const landing = new LandingPage(page);
    await landing.goto();
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(5000);
  });
});
