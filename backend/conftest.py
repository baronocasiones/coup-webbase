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

    The client is entered as a context manager so that a single blocking
    portal backs every request made through it.  This is load-bearing.

    Starlette's ``TestClient._portal_factory`` starts a *new* blocking portal
    for every request when ``client.portal`` is None — which is exactly the
    state a bare, un-entered ``TestClient`` is in.  Each ``websocket_connect``
    therefore ran on its own event loop, so the two sockets in
    ``test_broadcast_action`` lived in different loops.  ``ws1.send_json()``
    woke the server task on loop A, whose ``broadcast()`` then wrote into
    ``ws2``'s memory stream on loop B.  A memory-object stream only wakes
    receivers on the loop that created it, so the message sat in the buffer
    and ``ws2.receive_json()`` blocked forever.  Entering the context manager
    sets ``client.portal`` once and shares it, which fixes the delivery.

    Entering also runs the app's ``lifespan``, which only re-wires
    ``lobby_controller`` to the global ``game`` — something ``reset_game_state``
    already does on every test.
    """
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client

    # Teardown must also drop connections, and it runs *after* the context
    # manager above has closed its portal. Leaving a socket registered would
    # let the next test's `broadcast()` push into a dead peer.
    game_manager.active_connections.clear()
    chat_manager.active_connections.clear()


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
    # try to `send_json` on those dead sockets, which bled state into unrelated
    # files. Cleared on both sides of the test so a test that leaves a
    # connection open cannot poison the next one.
    game_manager.active_connections.clear()
    chat_manager.active_connections.clear()

    yield

    game_manager.active_connections.clear()
    chat_manager.active_connections.clear()
