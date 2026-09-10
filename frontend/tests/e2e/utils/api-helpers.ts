import { type Page } from '@playwright/test';

const API_BASE = 'http://localhost:8000';

export interface PlayerResponse {
  name: string;
  id: string;
  isReady: boolean;
  numberOfCards: number;
  coins: number;
}

export interface GameStateResponse {
  state: string;
  cardsInDeck: number;
  playersState: PlayerResponse[];
  declaredMove: string | null;
  declaredBlock: string | null;
  challengeLoser: PlayerResponse | null;
  currentTurn: PlayerResponse;
}

/**
 * Create a player via REST API.
 */
export async function createPlayer(page: Page, name: string): Promise<PlayerResponse> {
  const response = await page.request.post(`${API_BASE}/player?player_name=${name}`);
  return response.json();
}

/**
 * Get all players from REST API.
 */
export async function getPlayers(page: Page): Promise<PlayerResponse[]> {
  const response = await page.request.get(`${API_BASE}/players`);
  return response.json();
}

/**
 * Get game state from REST API.
 */
export async function getGameState(page: Page): Promise<GameStateResponse> {
  const response = await page.request.get(`${API_BASE}/game-state`);
  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`getGameState failed: ${response.status()} ${body}`);
  }
  return response.json();
}

/**
 * Get user player details from REST API.
 */
export async function getUserPlayer(page: Page, userId: string): Promise<any> {
  const response = await page.request.get(`${API_BASE}/user-player?user_id=${userId}`);
  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`getUserPlayer failed: ${response.status()} ${body} (userId=${userId})`);
  }
  return response.json();
}

/**
 * Start the game via REST API.
 */
export async function startGame(page: Page): Promise<void> {
  await page.request.get(`${API_BASE}/start-game`);
}

/**
 * Post a chat message via REST API.
 */
export async function postChat(page: Page, userId: string, username: string, message: string): Promise<void> {
  await page.request.post(`${API_BASE}/chat`, {
    data: { userId, sender_username: username, message },
  });
}

/**
 * Get chat messages via REST API.
 */
export async function getChats(page: Page): Promise<any[]> {
  const response = await page.request.get(`${API_BASE}/chats`);
  return response.json();
}

/**
 * Toggle player ready state via REST API.
 */
export async function toggleReady(page: Page, userId: string): Promise<PlayerResponse[]> {
  const response = await page.request.patch(`${API_BASE}/player?target_player_id=${userId}`);
  return response.json();
}

/**
 * Reset game state via test endpoint.
 */
export async function resetGame(page: Page): Promise<void> {
  await page.request.post(`${API_BASE}/test/reset`);
}
