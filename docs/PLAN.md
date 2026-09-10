# End-to-End Testing Plan

## 1. Goal

We want browser-level tests that verify the Coup app works from a real user's perspective: clicking through pages, connecting WebSockets, playing a full game with multiple browser tabs, and handling errors. Unit tests and integration tests already cover the backend (373 pytest tests) and frontend logic (18 vitest files). What's missing is proof that the whole system works when a human (or an automated browser) actually uses it.

This plan covers Playwright E2E tests, a GitHub Actions CI workflow, and the conventions the team will follow.

---

## 2. Constraints

| Constraint | Detail |
|------------|--------|
| **Python 3.12** | Backend runs on Python 3.12 (see `backend/.python-version`). No `pyproject.toml` or `setup.py`, so the backend is not an installable package. |
| **Node 22** | Frontend uses Node 22 (see `frontend/.node-version`). |
| **No TypeScript in frontend** | All frontend code is plain JSX. Playwright config and test files will use TypeScript though. |
| **Global game state** | `backend/utils/state.py` holds a singleton `CoupGame()`. The backend resets it via an autouse pytest fixture, but Playwright tests hit the running server. We need an API endpoint or server restart between test runs to reset state. |
| **sessionStorage** | `userId` and `username` live in `sessionStorage`. Playwright can access this via `page.evaluate()`. |
| **WebSocket environment** | Frontend reads `WS_HOST` (default `localhost`) and `WS_PORT` (default `8000`) from env vars. Tests run against `localhost`. |
| **No CI/CD yet** | No `.github/workflows/` directory exists. We are building it from scratch. |
| **Parallel browser contexts** | Multiplayer tests require 2-6 independent browser contexts (separate storage, cookies, sessions). |

---

## 3. Approach

### Why Playwright

Playwright gives us real browser automation (Chromium, Firefox, WebKit) out of the box. It handles WebSocket interception, multi-tab/multi-context scenarios, and has built-in assertions that wait for elements. Vitest + jsdom can't do any of that. For a multiplayer game with WebSockets, there's no practical alternative.

### How it fits with existing tests

The three testing layers serve different purposes:

- **Backend unit/integration tests (pytest):** Verify service logic, state machines, and route handlers. Fast, isolated, deterministic. Already solid.
- **Frontend unit/integration tests (vitest):** Verify React component rendering, API client calls, and utility functions. Already solid.
- **E2E tests (Playwright):** Verify the connected system works in a real browser. Slower, but catches issues the other layers miss: WebSocket timing, DOM updates from WS messages, route transitions, multi-user interactions.

### Architecture of the E2E suite

```
tests/e2e/
  fixtures/         # Shared setup: API helpers, WS helpers, multi-context helpers
  pages/            # Page Object Models (optional, lightweight)
  flows/            # Test files grouped by user journey
  utils/            # Reusable functions (login, create game, wait for WS)
  playwright.config.ts
```

We keep it simple. No heavy Page Object framework. Instead, we use Playwright fixtures and helper functions that wrap common patterns (create player, connect WS, start game).

---

## 4. Steps (ordered implementation)

### Step 1: Install and configure Playwright

```bash
cd frontend
npm init playwright@latest
```

This installs `@playwright/test` and creates `playwright.config.ts`. We will customize the config to:

- Use `localhost:5173` as the base URL
- Start both backend and frontend dev servers automatically via `webServer`
- Run tests in Chromium, Firefox, and WebKit
- Set a reasonable timeout (30s per test, 120s for slow multiplayer flows)
- Use `tests/e2e/` as the test directory

**Key config decisions:**

- `webServer` blocks: start backend FIRST (`uvicorn api:app --reload` on port 8000), wait for it, then start frontend (`vite` on port 5173).
- `use.baseURL`: `http://localhost:5173`
- `projects`: chromium, firefox, webkit
- `retries`: 1 in CI, 0 locally
- `workers`: 1 locally (game state is global), configurable in CI

### Step 2: Add a backend reset endpoint

The global game state singleton makes test isolation tricky. We need a way to reset the game between test runs without restarting the server.

**Known backend issue:** `ConnectionManager.broadcast()` in `connect()` sends to everyone EXCEPT the connecting player. This means the first player to connect won't see themselves in the initial player list. E2E tests will expose this.

Add to `backend/api.py`:

```python
@app.post('/test/reset')
def reset_game():
    """Reset game state. Only for testing — must match conftest.py exactly."""
    from services.Card import Card
    from services.GameState import GameState
    
    # Reset the global game singleton
    game.court_deck = Card()
    game.players.clear()
    game.chats.clear()
    game.state = GameState.WAITING_FOR_PLAYERS
    game.declared_move = None
    game.declared_block = None
    game.blocker_id = None
    game.move_target_id = None
    game.challenge_loser = None
    game.pending_influence_target = None
    game.exchange_cards = None
    game.currentTurnIndex = 0
    game.challenger_id = None
    
    # Re-wire controllers
    lobby_controller.set_game(game)
    game_controller.game = None
    game_controller.game_manager = None
    
    # Clear WebSocket connection managers
    game_manager.active_connections.clear()
    chat_manager.active_connections.clear()
    
    return {"status": "ok"}
```

This endpoint should be behind a flag or only available when `ENV=testing`. For now, since there's no auth system, we'll just document it as test-only.

### Step 3: Build test helpers and fixtures

Create a Playwright fixture file that extends the base test with:

**`tests/e2e/fixtures/test-base.ts`**

```typescript
import { test as base, expect } from '@playwright/test';

// Extend base test with custom fixtures
export const test = base.extend({
  // Auto-setup: reset game state before each test
  page: async ({ page }, use) => {
    // Reset backend state
    await page.request.post('http://localhost:8000/test/reset');
    await use(page);
  },
});

export { expect };
```

**`tests/e2e/utils/api-helpers.ts`** - REST API wrappers:

```typescript
// createPlayer(page, name) -> POST /player?player_name=X
// getPlayers(page) -> GET /players
// getGameState(page) -> GET /game-state
// startGame(page) -> GET /start-game
// postChat(page, userId, message) -> POST /chat
```

**`tests/e2e/utils/ws-helpers.ts`** - WebSocket connection helpers:

```typescript
// connectLobbyWs(page, userId) -> WebSocket to /ws/lobby
//   - Sends initial: { action: "connect", players: [...] }
//   - Receives: { action, players } for updates
//
// connectChatWs(page, userId) -> WebSocket to /ws/chat
//   - Sends initial: chat history array
//   - Receives: { userId, sender_username, message }
//
// connectGameWs(page, userId) -> WebSocket to /ws/game
//   - Sends initial: GameStateModel (full state)
//   - Receives: state updates, { action: "challenge_result", loser_id }
//
// sendWsMessage(ws, data) -> send JSON
// waitForWsMessage(ws, predicate, timeout?) -> wait for matching message
```

**Actual WebSocket message formats:**

Outbound (client → server):
- `declare_move`: `{ action: "declare_move", payload: { move: "TAX", target?: "uuid" } }`
- `block`: `{ action: "block", payload: { move: "BLOCK FOREIGN AID" } }`
- `challenge`: `{ action: "challenge", payload: { challengerId: "uuid" } }`
- `no_challenge`: `{ action: "no_challenge", payload: {} }`
- `exchange_selection`: `{ action: "exchange_selection", payload: { cards: ["DUKE", "ASSASSIN"] } }`
- `influence_selection`: `{ action: "influence_selection", payload: { card: "DUKE" } }`

Inbound (server → client):
- Lobby WS connect: `{ action: "connect", players: [PlayerModel...] }`
- Game WS connect: `GameStateModel` (state, cardsInDeck, playersState, declaredMove, declaredBlock, challengeLoser, currentTurn)
- Challenge result: `{ action: "challenge_result", loser_id: "uuid" | null }`
- Error: `{ error: "message" }`

**`tests/e2e/utils/game-flow.ts`** - High-level game setup:

```typescript
// createPlayerAndJoin(page, name) -> { userId, username }
//   1. Navigate to Landing
//   2. Enter name, submit
//   3. Wait for /lobby navigation
//   4. Extract userId from sessionStorage
//
// setupMultiplayer(browser, numPlayers) -> [{ context, page, userId, username }]
//   For each player:
//     1. Create new browser context
//     2. Create new page
//     3. Call createPlayerAndJoin
//   Return array of player objects
//
// startGameAsHost(hostPage) -> void
//   1. Ensure all players are ready
//   2. Click "Start Game" button
//   3. Wait for /playroom navigation
//
// waitForGameStart(page) -> void
//   Wait for page URL to become /playroom
```

### Step 4: Write tests organized by flow

Create one test file per major flow. Each file starts by resetting state and ends cleanly.

**Test files:**

1. `tests/e2e/flows/landing.spec.ts` - Landing page, player creation
2. `tests/e2e/flows/lobby.spec.ts` - Lobby, ready toggle, chat, start game
3. `tests/e2e/flows/game-setup.spec.ts` - Transition from lobby to playroom
4. `tests/e2e/flows/gameplay-basic.spec.ts` - Income, tax, foreign aid, coup
5. `tests/e2e/flows/gameplay-challenge.spec.ts` - Challenge mechanics
6. `tests/e2e/flows/gameplay-block.spec.ts` - Block actions
7. `tests/e2e/flows/gameplay-exchange.spec.ts` - Exchange + influence selection
8. `tests/e2e/flows/gameplay-assassinate.spec.ts` - Assassinate + influence loss
9. `tests/e2e/flows/chat.spec.ts` - Chat messages via REST + WS
10. `tests/e2e/flows/multiplayer.spec.ts` - 2-6 player scenarios
11. `tests/e2e/flows/edge-cases.spec.ts` - Error states, reconnection, boundary conditions

### Step 5: Write the Page Object Models (lightweight)

Keep it thin. We only create page objects for pages with non-trivial interaction:

**`tests/e2e/pages/LandingPage.ts`**

```typescript
export class LandingPage {
  constructor(private page: Page) {}

  async enterName(name: string) { ... }
  async submit() { ... }
  async waitForLobby() { ... }
}
```

**`tests/e2e/pages/LobbyPage.ts`**

```typescript
export class LobbyPage {
  constructor(private page: Page) {}

  async getPlayerList() { ... }
  async toggleReady() { ... }
  async startGame() { ... }
  async sendMessage(text: string) { ... }
  async getMessages() { ... }
}
```

**`tests/e2e/pages/PlayRoomPage.ts`**

```typescript
export class PlayRoomPage {
  constructor(private page: Page) {}

  async getGameState() { ... }
  async getYourCards() { ... }
  
  // Non-targeted actions (INCOME, FOREIGN AID, TAX, EXCHANGE)
  async performAction(action: string) { ... }
  
  // Targeted actions (COUP, ASSASSINATE, STEAL) - opens target modal
  async performTargetedAction(action: string) { ... }
  async selectTarget(playerName: string) { ... }
  
  // Challenge flow
  async challenge() { ... }
  async noChallenge() { ... }
  async acceptBlock() { ... }
  async challengeBlock() { ... }
  
  // Influence selection (after Coup/Assassinate)
  async selectInfluence(card: string) { ... }
  
  // Exchange (card selection modal)
  async selectExchangeCards(cards: string[]) { ... }
  
  async getOpponents() { ... }
}
```

### Step 6: Create the GitHub Actions workflow

Create `.github/workflows/e2e.yml`:

```yaml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm
          cache-dependency-path: frontend/package-lock.json

      - name: Install backend dependencies
        run: pip install -r backend/requirements.txt

      - name: Install frontend dependencies
        run: cd frontend && npm ci

      - name: Install Playwright browsers
        run: cd frontend && npx playwright install --with-deps

      - name: Start backend
        run: cd backend && uvicorn api:app --host 0.0.0.0 --port 8000 &
        env:
          ENV: testing

      - name: Wait for backend
        run: npx wait-on http://localhost:8000/players --timeout 30000

      - name: Start frontend
        run: cd frontend && npm run dev &
        env:
          API_URL: http://localhost:8000

      - name: Wait for frontend
        run: npx wait-on http://localhost:5173 --timeout 30000

      - name: Run E2E tests
        run: cd frontend && npx playwright test

      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: frontend/playwright-report/
          retention-days: 7
```

### Step 7: Update documentation

- Update `docs/tests.md` with E2E testing section
- Update `docs/cicd.md` with the E2E workflow
- Update `AGENTS.md` with Playwright commands

---

## 5. Test matrix

### Landing page

| Test ID | Description | Priority |
|---------|-------------|----------|
| L-01 | Page loads and shows player name input | P0 |
| L-02 | Submit with empty name shows error or prevents submission | P1 |
| L-03 | Submit with valid name creates player and navigates to /lobby | P0 |
| L-04 | sessionStorage contains userId and username after submit | P0 |
| L-05 | Page loads within 3 seconds | P2 |

### Lobby

| Test ID | Description | Priority |
|---------|-------------|----------|
| LB-01 | Lobby page loads and connects to /ws/lobby | P0 |
| LB-02 | Player appears in player list | P0 |
| LB-03 | Ready toggle changes player state | P0 |
| LB-04 | Host can see Start Game button (others cannot) | P1 |
| LB-05 | Start Game disabled when not all players ready | P1 |
| LB-06 | Start Game enabled when all players ready | P0 |
| LB-07 | Chat messages send and appear in real time | P0 |
| LB-08 | Chat history loads from REST on page load | P1 |
| LB-09 | Multiple players appear in player list | P0 |
| LB-10 | Player disconnect removes from list | P2 |

### Game setup (Lobby -> PlayRoom)

| Test ID | Description | Priority |
|---------|-------------|----------|
| GS-01 | Start Game navigates to /playroom | P0 |
| GS-02 | /ws/game WebSocket connects on PlayRoom load | P0 |
| GS-03 | Game state shows all players | P0 |
| GS-04 | Each player sees their own 2 cards | P0 |
| GS-05 | Opponent cards are face-down | P0 |
| GS-06 | Action buttons appear for current player | P0 |
| GS-07 | Non-current player sees waiting state | P1 |

### Gameplay: basic actions

| Test ID | Description | Priority |
|---------|-------------|----------|
| GA-01 | Income: +1 coin, turn advances | P0 |
| GA-02 | Foreign Aid: +2 coins, ACTION_DECLARED state | P0 |
| GA-03 | Tax: +3 coins, ACTION_DECLARED state | P0 |
| GA-04 | Coup (7+ coins): costs 7, target loses influence | P0 |
| GA-05 | Coup (10+ coins): forced coup — ONLY Coup button visible, "Forced Coup!" label, other action buttons hidden | P1 |
| GA-06 | Coup with <7 coins: button disabled | P1 |
| GA-07 | Coins update in UI after each action | P0 |
| GA-08 | Turn indicator shows correct current player | P0 |

### Gameplay: targeted actions

| Test ID | Description | Priority |
|---------|-------------|----------|
| GT-01 | Steal: target selection modal → click opponent → coins transfer | P0 |
| GT-02 | Steal from player with 0 coins: no coins taken | P2 |
| GT-03 | Assassinate: costs 3, target selection → opponent loses influence | P0 |
| GT-04 | Assassinate with <3 coins: button disabled | P1 |
| GT-05 | Exchange: declare → no challenge → PENDING_EXCHANGE → modal shows 4 cards (2 original + 2 drawn) → select 2 → confirm | P0 |
| GT-06 | Exchange with single card: draw 1, keep 1 | P2 |

**Exchange modal interaction pattern:**
1. Cards displayed as buttons with `card + index` identifier (e.g., DUKE0, ASSASSIN1)
2. Player clicks cards to select/deselect
3. Selection count shown as "N / M selected"
4. Confirm button disabled until `selected.length === currentCardCount`
5. On confirm, sends `exchange_selection` WS message with card names array

### Gameplay: challenges

| Test ID | Description | Priority |
|---------|-------------|----------|
| CH-01 | Challenge window appears after declare_move (for non-current player) | P0 |
| CH-02 | Challenge multi-step flow: send challenge WS → receive challenge_result with loser_id → if INFLUENCE_SELECTION_PENDING, loser picks card | P0 |
| CH-03 | Successful challenge: loser was lying (declared move not in their moves), loser loses influence | P0 |
| CH-04 | Failed challenge: challenger loses influence (declared move was in actor's moves) | P0 |
| CH-05 | No challenge: action proceeds normally via handle_no_challenge | P0 |
| CH-06 | Challenge on block: BLOCK_DECLARED → challenge → CHALLENGE_HANDLE, blocker or challenger loses | P0 |

### Gameplay: blocks

Preconditions: Block requires `ACTION_DECLARED` state, a blockable declared move, and a different player than the action declarer.

| Test ID | Description | Priority |
|---------|-------------|----------|
| BL-01 | Block Foreign Aid: state=ACTION_DECLARED, declaredMove=FOREIGN_AID, Duke blocks → action cancelled | P0 |
| BL-02 | Block Assassination: state=ACTION_DECLARED, declaredMove=ASSASSINATE, Contessa blocks → action cancelled | P0 |
| BL-03 | Block Steal: state=ACTION_DECLARED, declaredMove=STEAL, Captain/Ambassador blocks | P0 |
| BL-04 | Challenge on block: BLOCK_DECLARED → challenge block → CHALLENGE_HANDLE → blocker or challenger loses | P0 |
| BL-05 | Unblockable action: Income/Tax/Coup cannot be blocked (is_blockable() returns false) | P1 |

### Gameplay: influence selection

| Test ID | Description | Priority |
|---------|-------------|----------|
| IS-01 | After failed challenge or successful block, influence selection appears | P0 |
| IS-02 | Player picks card to lose, card is removed | P0 |
| IS-03 | Last card lost: player eliminated, game over check | P0 |

### Chat

| Test ID | Description | Priority |
|---------|-------------|----------|
| CT-01 | Send message via REST, appears in chat list | P0 |
| CT-02 | WebSocket broadcast: message appears for other players | P0 |
| CT-03 | Chat persists across page reload | P1 |
| CT-04 | Multiple messages in sequence display correctly | P1 |

### Multiplayer

| Test ID | Description | Priority |
|---------|-------------|----------|
| MP-01 | 2 players: full game flow | P0 |
| MP-02 | 3 players: turn rotation works correctly | P0 |
| MP-03 | 4-6 players: game starts and plays | P1 |
| MP-04 | Player eliminated: removed from turn rotation | P0 |
| MP-05 | Game over: winner announced when one player remains | P0 |
| MP-06 | Each player sees only their own cards | P0 |
| MP-07 | Actions by one player visible to all others in real time | P0 |

### Edge cases and errors

| Test ID | Description | Priority |
|---------|-------------|----------|
| EC-01 | WebSocket disconnect and reconnect | P1 |
| EC-02 | Backend server restart during game | P2 |
| EC-03 | Navigate directly to /lobby without creating player → redirects to / | P1 |
| EC-04 | Navigate directly to /playroom without starting game → redirects to / | P1 |
| EC-05 | Invalid player ID in sessionStorage | P2 |
| EC-06 | Concurrent actions from multiple tabs | P2 |
| EC-07 | Browser back/forward navigation | P2 |
| EC-08 | Page refresh during gameplay → re-fetches game state, reconnects WS, state persists | P1 |
| EC-09 | Invalid WebSocket action → server returns { error: "Unknown action: ..." } | P1 |
| EC-10 | Missing required payload fields → server returns error | P2 |

### Cross-browser

| Test ID | Description | Priority |
|---------|-------------|----------|
| CB-01 | Core flows pass on Chromium | P0 |
| CB-02 | Core flows pass on Firefox | P1 |
| CB-03 | Core flows pass on WebKit | P1 |

---

## 6. File structure

```
frontend/
  playwright.config.ts
  tests/
    e2e/
      fixtures/
        test-base.ts          # Extended test fixture with reset
      pages/
        LandingPage.ts        # Landing page object
        LobbyPage.ts          # Lobby page object
        PlayRoomPage.ts       # PlayRoom page object
      utils/
        api-helpers.ts        # REST API wrapper functions
        ws-helpers.ts         # WebSocket connection helpers
        game-flow.ts          # High-level game setup sequences
      flows/
        landing.spec.ts
        lobby.spec.ts
        game-setup.spec.ts
        gameplay-basic.spec.ts
        gameplay-challenge.spec.ts
        gameplay-block.spec.ts
        gameplay-exchange.spec.ts
        gameplay-assassinate.spec.ts
        chat.spec.ts
        multiplayer.spec.ts
        edge-cases.spec.ts

backend/
  api.py                      # Add /test/reset endpoint

.github/
  workflows/
    e2e.yml                   # Playwright CI workflow
    ci.yml                    # Existing lint + unit + integration tests (future)
```

---

## 7. Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Global game state between tests** | Tests run serially but share server state. One test's leftover state breaks the next. | POST /test/reset before each test. Fixture handles this automatically. |
| **WebSocket timing** | WS messages are async. Tests may assert before the message arrives. | Use Playwright's `waitForFunction` or custom `waitForWsMessage` with timeout. Never hard-code delays. |
| **Multiplayer complexity** | 2-6 browser contexts means 2-6 Playwright pages, each with their own WS. Coordination is hard. | Helper functions that create N players, connect their WS, and return an array of contexts. Keep multiplayer tests focused on one scenario each. |
| **Flaky tests from random card draws** | Exchange and challenge tests depend on which cards are drawn from the shuffled deck. | Stub the deck for specific tests. Or assert on structural outcomes (player has 2 cards) rather than specific card values. |
| **CI environment speed** | Playwright tests are slow (browsers + servers). CI might take 10+ minutes. | Run core flows (P0) on every PR. Run full suite on merge to main. Use `--project=chromium` for fast CI feedback. |
| **No backend auth** | /test/reset endpoint is open. Could be hit in production. | Gate behind `ENV=testing` check. Document clearly. Remove before any production deployment. |
| **Lazy-loaded routes** | React.lazy + Suspense means pages load asynchronously. Playwright might interact before the page renders. | Use `page.waitForSelector` on a known element (e.g., the page heading) before interacting. |

---

## 8. Open questions

1. **Game state reset mechanism:** DECIDED — Use `/test/reset` endpoint (faster than server restart). Endpoint matches `conftest.py` exactly.

2. **Card stubbing for deterministic tests:** DEFERRED — Assert on structural outcomes (player has 2 cards) rather than specific card values. Can add deck stubbing later if flakiness is an issue.

3. **CI parallelism:** DECIDED — Run serially (`--workers=1`) due to global game state. Can revisit if state isolation improves.

4. **Visual regression:** DEFERRED — Not adding screenshot comparison now. Can add later with `toHaveScreenshot()`.

5. **Performance budgets:** DEFERRED — Not adding load-time assertions now.

6. **Test data:** DECIDED — Use fixed player names (Alice, Bob, Charlie) for easier debugging. Can add randomization later.

---

## 9. CI/CD integration

### Workflow: `.github/workflows/e2e.yml`

Triggers on push to `main` and on pull requests to `main`.

**Job: e2e**

1. Checkout code
2. Setup Python 3.12 and Node 22
3. Install backend deps (`pip install -r requirements.txt`)
4. Install frontend deps (`npm ci`)
5. Install Playwright browsers (`npx playwright install --with-deps`)
6. Start backend server (background)
7. Start frontend dev server (background)
8. Wait for both servers to be ready
9. Run `npx playwright test`
10. Upload `playwright-report/` as artifact on failure

**Environment variables:**

- `ENV=testing` (enables /test/reset endpoint)
- `API_URL=http://localhost:8000`

**Artifact retention:** 7 days for test results, 30 days for traces.

### Workflow: `.github/workflows/ci.yml`

This is the broader CI pipeline (separate from E2E):

1. **Backend job:** black --check, mypy, pytest -m unit, pytest -m integration
2. **Frontend job:** npm run lint, npm run build, vitest run
3. **E2E job:** runs after both backend and frontend pass

The three jobs can run in parallel, with E2E gated on the other two.

---

## 10. Conventions

### Naming

- Test files: `kebab-case.spec.ts` (e.g., `gameplay-challenge.spec.ts`)
- Test descriptions: start with the action or subject, not "it should" (Playwright adds "should" automatically)
- Helper functions: `camelCase` (e.g., `createPlayerAndJoin`)
- Page objects: `PascalCase` (e.g., `PlayRoomPage`)

### Assertions

- Use Playwright's auto-waiting assertions: `expect(locator).toBeVisible()` instead of `expect(locator).isVisible()`
- Prefer `toHaveText` and `toContainText` over exact string matches where possible
- Assert on structural state (player count, coin count, button enabled/disabled) rather than pixel-level details

### Timeouts

- Default test timeout: 30 seconds
- Navigation timeout: 10 seconds
- WS message wait: 5 seconds
- Custom timeouts via `test.setTimeout()` for slow multiplayer scenarios

### Parallelism

- Locally: serial (`--workers=1`) because of global game state
- CI: serial for now. If state isolation improves, switch to `--workers=2` with `--shard=1/2`

### Debugging

- Use `npx playwright test --debug` to step through tests with the inspector
- Use `npx playwright show-trace <trace.zip>` to replay failed test traces
- CI uploads traces on failure for post-mortem analysis

### What we don't test in E2E

- CSS styling correctness (covered by visual review, not automated tests)
- Backend business logic (covered by 373 pytest tests)
- React component rendering details (covered by vitest tests)
- Performance benchmarks (deferred)
- Accessibility audits (deferred, though Playwright + axe-core is an option later)
