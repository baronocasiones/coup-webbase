import { type Page } from '@playwright/test';

const WS_BASE = 'ws://localhost:8000';

export interface WsMessage {
  action?: string;
  payload?: any;
  players?: any[];
  error?: string;
  loser_id?: string | null;
  [key: string]: any;
}

/**
 * Connect to the lobby WebSocket.
 * Returns the raw WebSocket object.
 */
export function connectLobbyWs(page: Page, userId: string): Promise<WebSocket> {
  return page.evaluate((uid) => {
    return new Promise<WebSocket>((resolve) => {
      const ws = new WebSocket(`ws://localhost:8000/ws/lobby?user_id=${uid}`);
      ws.onopen = () => resolve(ws);
    });
  }, userId);
}

/**
 * Connect to the chat WebSocket.
 */
export function connectChatWs(page: Page, userId: string): Promise<WebSocket> {
  return page.evaluate((uid) => {
    return new Promise<WebSocket>((resolve) => {
      const ws = new WebSocket(`ws://localhost:8000/ws/chat?user_id=${uid}`);
      ws.onopen = () => resolve(ws);
    });
  }, userId);
}

/**
 * Connect to the game WebSocket.
 */
export function connectGameWs(page: Page, userId: string): Promise<WebSocket> {
  return page.evaluate((uid) => {
    return new Promise<WebSocket>((resolve) => {
      const ws = new WebSocket(`ws://localhost:8000/ws/game?user_id=${uid}`);
      ws.onopen = () => resolve(ws);
    });
  }, userId);
}

/**
 * Send a JSON message through a WebSocket.
 */
export async function sendWsMessage(page: Page, ws: WebSocket, data: any): Promise<void> {
  await page.evaluate(({ ws, data }) => {
    ws.send(JSON.stringify(data));
  }, { ws, data });
}

/**
 * Wait for a WebSocket message matching a predicate.
 * Returns the first matching message within timeout.
 */
export async function waitForWsMessage(
  page: Page,
  ws: WebSocket,
  predicate: (msg: WsMessage) => boolean,
  timeoutMs: number = 5000
): Promise<WsMessage> {
  return page.evaluate(({ ws, predicateStr, timeoutMs }) => {
    const pred = new Function('msg', `return ${predicateStr}`);
    return new Promise<any>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout waiting for WS message')), timeoutMs);
      const originalOnMessage = ws.onmessage;
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (pred(data)) {
          clearTimeout(timeout);
          ws.onmessage = originalOnMessage;
          resolve(data);
        }
      };
    });
  }, { ws, predicateStr: predicate.toString(), timeoutMs });
}

/**
 * Declare a move via WebSocket.
 */
export async function declareMove(page: Page, ws: WebSocket, move: string, target?: string): Promise<void> {
  const payload: any = { move };
  if (target) payload.target = target;
  await sendWsMessage(page, ws, { action: 'declare_move', payload });
}

/**
 * Block an action via WebSocket.
 */
export async function blockAction(page: Page, ws: WebSocket, blockMove: string): Promise<void> {
  await sendWsMessage(page, ws, { action: 'block', payload: { move: blockMove } });
}

/**
 * Challenge via WebSocket.
 */
export async function challengeAction(page: Page, ws: WebSocket, challengerId?: string): Promise<void> {
  const payload: any = {};
  if (challengerId) payload.challengerId = challengerId;
  await sendWsMessage(page, ws, { action: 'challenge', payload });
}

/**
 * Pass on challenge via WebSocket.
 */
export async function noChallenge(page: Page, ws: WebSocket): Promise<void> {
  await sendWsMessage(page, ws, { action: 'no_challenge', payload: {} });
}

/**
 * Select exchange cards via WebSocket.
 */
export async function exchangeSelection(page: Page, ws: WebSocket, cards: string[]): Promise<void> {
  await sendWsMessage(page, ws, { action: 'exchange_selection', payload: { cards } });
}

/**
 * Select influence to lose via WebSocket.
 */
export async function influenceSelection(page: Page, ws: WebSocket, card: string): Promise<void> {
  await sendWsMessage(page, ws, { action: 'influence_selection', payload: { card } });
}
