# Backend Implementation Plan — COMPLETED

All four features have been implemented and tested. 319 tests pass (294 original + 25 new).

---

## Implementation order

1. Logging (Feature 1) ✅
2. Forced coup at 10 coins (Feature 2) ✅
3. Chat WebSocket sync simplification (Feature 3) ✅
4. Block resolution (Feature 4) ✅

---

## Feature 1: Logging ✅

### New file: `backend/logging_config.py`

```python
import logging
import sys

def setup_logging():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(name)s %(levelname)s %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )
```

### Files changed

- [x] `backend/logging_config.py` (new file)
- [x] `backend/api.py` — 4 print() calls replaced with logger.warning/error
- [x] `backend/services/actions/base.py` — 2 print() calls replaced with logger.error
- [x] `backend/routes/game.py` — traceback.print_exc() replaced with logger.error

---

## Feature 2: Forced coup at 10 coins ✅

### Files changed

- [x] `backend/services/CoupGame.py` — Added forced coup guard in `declare_move()`

---

## Feature 3: Chat WebSocket sync simplification ✅

### Files changed

- [x] `backend/api.py` — Removed broken sync check and userId override in `/ws/chat`
- [x] `backend/services/CoupGame.py` — Simplified `add_chat()` timestamp validation
- [x] `backend/routes/chats.py` — Added SynchronizationError handling (400 instead of 500)

---

## Feature 4: Block resolution ✅

### Files changed

- [x] `backend/services/CoupGame.py`
  - Fixed state guard in `declare_move()` for blocks
  - Updated `get_challenge_loser()` for block challenges
  - Updated `handle_no_challenge()` to cancel action on block
  - Added `declared_block = None` to `next_turn()` reset
- [x] `backend/routes/game.py` — Implemented `"block"` WebSocket action

---

## Testing

### Existing tests updated

- `tests/test_CoupGame.py` — 2 tests updated for new block behavior
- `tests/test_actions.py` — 1 test updated for forced coup

### New tests (25 total in `tests/test_new_features.py`)

- Forced coup: 9 tests
- Block declaration: 5 tests
- Block challenge: 3 tests
- Block no-challenge: 2 tests
- Declared block reset: 1 test
- Chat timestamps: 5 tests

All marked with `@pytest.mark.unit` so they run in CI.

---

## Summary of files changed

| File | Features |
|------|----------|
| `backend/logging_config.py` | 1 (new file) |
| `backend/api.py` | 1, 3 |
| `backend/services/actions/base.py` | 1 |
| `backend/routes/game.py` | 1, 4 |
| `backend/services/CoupGame.py` | 2, 3, 4 |
| `backend/routes/chats.py` | 3 |
| `backend/tests/test_CoupGame.py` | 4 (updated) |
| `backend/tests/test_actions.py` | 2 (updated) |
| `backend/tests/test_new_features.py` | 2, 3, 4 (new) |
