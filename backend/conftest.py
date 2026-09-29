import pytest
from fastapi.testclient import TestClient
from api import app, game_manager, chat_manager
from services.Card import Card
from services.GameState import GameState
from controllers.LobbyController import lobby_controller
from controllers.GameController import game_controller
from utils.state import game


def pytest_configure(config):
    config.addinivalue_line("markers", "unit: Pure unit tests (single module, no HTTP, no global state)")
    config.addinivalue_line(
        "markers",
        "integration: Integration tests (multi-module, HTTP, global state, or WebSocket)",
    )


@pytest.fixture
def client():
    """Create a synchronous TestClient for the FastAPI app.

    ``raise_server_exceptions=False`` makes the client return 500 responses
    for unhandled server errors instead of propagating them as Python
    exceptions — closer to real HTTP behaviour and easier to assert on.
    """
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture(autouse=True)
def reset_game_state():
    """Reset global game state before every test to prevent cross-test contamination.

    The global ``game`` singleton persists across tests.  We must fully
    re-initialise every mutable attribute — including the court deck — so
    that ``start_game()`` can always deal fresh cards.

    Note: ``game_controller`` is intentionally **not** wired here.
    The ``/start-game`` endpoint is responsible for that.  Leaving it
    uninitialised preserves the 404 behaviour that existing tests depend on.
    """
    # Replace the court deck with a brand-new shuffled deck
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

    # Re-wire lobby_controller to the global game instance
    lobby_controller.set_game(game)

    # Reset game_controller so stale state from previous tests
    # (e.g. set by /start-game) doesn't leak into the next test.
    game_controller.game = None
    game_controller.game_manager = None

    # Drop connections held by the module-level ConnectionManagers.
    #
    # These outlive any individual test, and a `TestClient` WebSocket that has
    # left its `with` block is not a usable peer. A later `broadcast()` would
    # try to `send_json` on those dead sockets, which is what made the
    # WebSocket integration tests hang intermittently and bled state into
    # unrelated files. Cleared on both sides of the test so a test that leaves a
    # connection open cannot poison the next one.
    game_manager.active_connections.clear()
    chat_manager.active_connections.clear()

    yield

    game_manager.active_connections.clear()
    chat_manager.active_connections.clear()
