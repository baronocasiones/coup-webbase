# AGENTS.md

Coup board game — React 19 + FastAPI. Real-time multiplayer with WebSockets.

## Commands

### Frontend (`frontend/`)
```bash
npm run dev          # Vite dev server (localhost:5173)
npm run build        # Production build
npm run lint         # ESLint
npm test             # Run all frontend tests (vitest)
npm run test:watch   # Watch mode
npm run test:coverage # With coverage report
npx playwright test  # Run E2E tests (requires backend running)
npx playwright test --debug  # Step through with inspector
npx playwright test flows/gameplay-basic.spec.ts  # Single flow
```

### Backend (`backend/`)
```bash
uvicorn api:app --reload          # Dev server (localhost:8000)
pip install -r requirements.txt   # Production deps
pip install -r requirements-dev.txt  # Dev: pytest, black, mypy
pytest                            # All tests (373 total)
pytest -m unit                    # Unit tests only (CI runs this)
pytest -m integration             # Integration tests only (CI runs this too)
pytest --cov=services --cov=controllers --cov=routes  # With coverage
pytest tests/test_player.py       # Single file
pytest tests/test_player.py::test_foo  # Single test
black .                           # Format (88 char line)
mypy backend/                     # Type check
```

## Gotchas

- `.gitignore` ignores `*.md` — this file is not committed to git
- Backend has no `pyproject.toml` or `setup.py` — not an installable package
- Global game state is a singleton in `backend/utils/state.py` (`game = CoupGame()`)
- Frontend axios base URL: `import.meta.env.API_URL || 'http://localhost:8000'` (`frontend/src/axios.js`)
- Backend uses modern FastAPI `lifespan` context manager (see `api.py`)
- CSS Modules required for all frontend component styles — files live in `frontend/src/styles/*.module.css`, not alongside components
- Frontend routes are lazy-loaded in `main.jsx` with `Suspense`
- CI runs both `pytest -m unit` and `pytest -m integration` with coverage — frontend lint is not in CI
- Logging: `logging_config.py` configures root logger; modules use `logging.getLogger(__name__)`
- Forced coup: players with 10+ coins MUST declare COUP (`COUP_THRESHOLD` in `utils/globals.py`)
- Block resolution: blocks require `ACTION_DECLARED` state; can be challenged; unchallenged blocks cancel the action
- Chat: WebSocket handler broadcasts only — REST endpoint (`POST /chat`) handles persistence
- Frontend tests: vitest + @testing-library/react; mock axios via `vi.mock('../../axios')`; mock services in page integration tests; use `renderWithProviders()` from `test-utils.jsx` for QueryClient + Router

## Structure

- `backend/logging_config.py` — `setup_logging()` for structured logging
- `backend/services/` — Domain logic (`CoupGame`, `Player`, `GameState`, action handlers)
- `backend/services/actions/` — Strategy-pattern action implementations (`assassinate.py`, `steal.py`, etc.), each extending `BaseActionStrategy`
- `backend/controllers/` — `GameController`, `LobbyController`
- `backend/routes/` — FastAPI endpoint handlers (`players`, `chats`, `game`)
- `backend/models/` — Pydantic models (note: class names differ from service classes, e.g., `PlayerModel` vs `Player`)
- `backend/conftest.py` — Registers `unit` and `integration` pytest markers; autouse fixture resets global game state (including court deck) between every test
- `backend/pytest.ini` — Pytest config: testpaths and marker definitions
- `backend/tests/test_routes.py` — HTTP endpoint integration tests (players, game-state, start-game)
- `backend/tests/test_chat_integration.py` — Chat REST endpoint integration tests (GET /chats, POST /chat)
- `backend/tests/test_ws_integration.py` — WebSocket integration tests (lobby, chat, game WS)
- `backend/tests/test_e2e_game.py` — End-to-end game flow tests via HTTP + service layer
- `backend/tests/test_new_features.py` — Tests for forced coup, block resolution, and chat
- `frontend/src/pages/` — `Landing.jsx`, `Lobby.jsx`, `PlayRoom.jsx`
- `frontend/src/components/` — `ChatBox`, `ChatBoxSkeleton`, `Opponents`, `Modal`, `Loader`, `PrimaryButton`, `GameStatus`, `ChallengePanel`, `ExchangeModal`, `InfluencePicker`, `GameOver`
- `frontend/src/styles/` — CSS Modules (all `.module.css` files live here, not co-located with components)
- `frontend/src/services/` — API client modules (`player.js`, `chat.js`, `game.js`)
- `frontend/src/utils/` — Utilities (`gameActions.js` for broadcast functions + action constants)
- `frontend/src/__tests__/` — Frontend test suite (vitest + @testing-library/react)
  - `__tests__/test-utils.jsx` — Shared `renderWithProviders()` wrapper (QueryClient + MemoryRouter)
  - `__tests__/services/` — Unit tests for `player.js`, `chat.js`, `game.js`
  - `__tests__/utils/` — Unit tests for `gameActions.js`
  - `__tests__/hooks/` — Unit tests for `useStateMachine.js`
  - `__tests__/components/` — Unit tests for all 12 components
  - `__tests__/pages/` — Integration tests for `Landing`, `Lobby`, `PlayRoom`
- `frontend/src/setupTests.js` — Test setup: jsdom mocks (sessionStorage, WebSocket, window.location)
- `frontend/tests/e2e/` — Playwright E2E tests (TypeScript)
  - `tests/e2e/flows/` — Test files grouped by user journey (landing, lobby, gameplay-*, chat, multiplayer, edge-cases)
  - `tests/e2e/fixtures/` — Extended test fixtures (game state reset)
  - `tests/e2e/pages/` — Page Object Models (LandingPage, LobbyPage, PlayRoomPage)
  - `tests/e2e/utils/` — Helpers (api-helpers, ws-helpers, game-flow)
- `frontend/playwright.config.ts` — Playwright config (webServer, projects, timeouts)
- `.github/workflows/e2e.yml` — E2E CI workflow (Playwright, triggered on push/PR to main)

## Conventions

- Python: snake_case functions, PascalCase classes, type hints required, `list[Type]` syntax
- JS: PascalCase components, camelCase functions, ES6 imports
- Backend imports are absolute: `from services.Player import Player`
- Frontend components are default-exported functional components
- `useRef()` preferred over controlled inputs for forms
- Frontend uses TanStack Query (React Query 5) for server state
- No TypeScript — frontend is plain JSX

## Runtime Versions

- Python 3.12 (see `backend/.python-version`)
- Node 22 (see `frontend/.node-version`)

## Session History

### 2026-09-03: Architecture Cleanup & Refactoring
- **Implemented:**
  - Removed dead backend code (`BaseRemoveInfluence` ABC, `lobby_manager` in LobbyController).
  - Removed dead frontend code (`useStateMachine` hook, `Toast` component, associated tests and styles).
  - Replaced deprecated FastAPI `@app.on_event('startup')` with modern `lifespan` context manager in `api.py`.
  - Cleaned up dead/unused pip dependencies (`gevent`, `greenlet`, `zope.event`, `zope.interface`, `websocket`, `uuid` PyPI package) from `requirements.txt`.
  - Fixed type hints in `GameController.py` and removed stale TODOs in `CoupGame.py`.
  - Deleted obsolete `TEST_VERIFICATION.txt`.
  - Updated architecture, backend, and frontend documentation in `docs/`.
- **Conventions & Patterns Established:**
  - Strict dead-code removal protocol verified against architecture docs.
  - Modern FastAPI `lifespan` context manager adopted for application initialization.

### 2026-09-10: E2E Testing — Root Cause Fixes & WS Broadcast
- **Implemented:**
  - Fixed E2E tests: Lobby's `beforeunload` handler was deleting players during `page.goto()` navigation. Added `page.route()` interception in `safeNavigateToPlayroom()` to abort `DELETE /player` requests.
  - Fixed `/user-player` 500 error: Added null-check for `player` after `game_controller.get_player_by_id()` returns `None`.
  - Added WebSocket broadcast to game WS handler: After each action (`declare_move`, `block`, `no_challenge`, `exchange_selection`, `influence_selection`), the handler now broadcasts the updated `GameStateModel` to all OTHER connected players.
  - Fixed `safeNavigateToPlayroom()` reload: Changed `waitUntil: 'networkidle'` to `waitUntil: 'load'` to avoid timeout on pages with WebSocket connections.
  - Diagnostic investigation: Traced player disappearance to `Lobby.jsx` `beforeunload` handler calling `removePlayerMutation()` on page navigation.
- **Conventions & Patterns Established:**
  - E2E navigation must intercept `DELETE /player` to prevent Lobby's `beforeunload` cleanup from removing players.
  - Use `waitUntil: 'load'` (not `'networkidle'`) for pages with WebSocket connections.
  - Game WS broadcasts go to all OTHER players; sender must poll REST API for own state (known `ConnectionManager.broadcast()` design limitation).
  - 27/28 E2E tests passing; BL-01 (block test) depends on broadcast reaching opponent's page.

