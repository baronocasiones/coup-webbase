# AGENTS.md

Coup board game — React 19 + FastAPI. Real-time multiplayer with WebSockets.

## Commands

### Frontend (`frontend/`)
```bash
npm run dev        # Vite dev server (localhost:5173)
npm run build      # Production build
npm run lint       # ESLint
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
- Backend uses deprecated `@app.on_event('startup')` (see `api.py`)
- CSS Modules required for all frontend component styles — files live in `frontend/src/styles/*.module.css`, not alongside components
- Frontend routes are lazy-loaded in `main.jsx` with `Suspense`
- CI runs both `pytest -m unit` and `pytest -m integration` with coverage — frontend lint is not in CI
- Logging: `logging_config.py` configures root logger; modules use `logging.getLogger(__name__)`
- Forced coup: players with 10+ coins MUST declare COUP (`COUP_THRESHOLD` in `utils/globals.py`)
- Block resolution: blocks require `ACTION_DECLARED` state; can be challenged; unchallenged blocks cancel the action
- Chat: WebSocket handler broadcasts only — REST endpoint (`POST /chat`) handles persistence

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
- `frontend/src/components/` — `ChatBox`, `Opponents`, `Modal`, `Toast`, etc.
- `frontend/src/hooks/` — Custom hooks (`useStateMachine`)
- `frontend/src/styles/` — CSS Modules (all `.module.css` files live here, not co-located with components)
- `frontend/src/services/` — API client modules (`player.js`, `chat.js`, `game.js`)
- `frontend/src/utils/` — Utilities (`gameActions.js` for `broadcastMove`)

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
