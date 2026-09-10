import { test, expect } from '../fixtures/test-base';
import { createPlayerAndJoin } from '../utils/game-flow';
import { postChat, getChats } from '../utils/api-helpers';

test.describe('Chat', () => {
  test('CT-01: send message via REST appears in chat list', async ({ page }) => {
    await createPlayerAndJoin(page, 'Alice');
    const userId = await page.evaluate(() => sessionStorage.getItem('userId') || '');

    await postChat(page, userId, 'Alice', 'Hello everyone!');
    const chats = await getChats(page);

    expect(chats.length).toBeGreaterThanOrEqual(1);
    const lastChat = chats[chats.length - 1];
    expect(lastChat.message).toBe('Hello everyone!');
    expect(lastChat.sender_username).toBe('Alice');
  });

  test('CT-04: multiple messages in sequence display correctly', async ({ page }) => {
    await createPlayerAndJoin(page, 'Alice');
    const userId = await page.evaluate(() => sessionStorage.getItem('userId') || '');

    await postChat(page, userId, 'Alice', 'Message 1');
    await postChat(page, userId, 'Alice', 'Message 2');
    await postChat(page, userId, 'Alice', 'Message 3');

    const chats = await getChats(page);
    expect(chats.length).toBeGreaterThanOrEqual(3);

    // Check last 3 messages
    const recentChats = chats.slice(-3);
    expect(recentChats[0].message).toBe('Message 1');
    expect(recentChats[1].message).toBe('Message 2');
    expect(recentChats[2].message).toBe('Message 3');
  });
});
