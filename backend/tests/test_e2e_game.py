"""End-to-end integration tests exercising a full game via the HTTP REST API."""
import pytest
from uuid import uuid4

from services.GameState import GameState
from services.GameAction import GameAction
from services.BlockMove import BlockMove
from services.Influence import Influence
from controllers.LobbyController import lobby_controller
from utils.state import game


pytestmark = pytest.mark.integration


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _add_player(client, name: str) -> dict:
    return client.post(f"/player?player_name={name}").json()


def _start_game(client):
    return client.get("/start-game")


def _get_player_coins(client, player_id: str) -> int:
    resp = client.get(f"/user-player?user_id={player_id}")
    if resp.status_code == 200:
        return resp.json()["coins"]
    return None


# ---------------------------------------------------------------------------
# Lobby lifecycle
# ---------------------------------------------------------------------------

class TestLobbyLifecycle:
    """Full lobby lifecycle: create, join, ready, start."""

    def test_create_lobby_and_add_players(self, client):
        """Add multiple players and verify lobby state."""
        p1 = _add_player(client, "Alice")
        p2 = _add_player(client, "Bob")
        p3 = _add_player(client, "Charlie")

        players = client.get("/players").json()
        assert len(players) == 3
        ids = {p["id"] for p in players}
        assert p1["id"] in ids
        assert p2["id"] in ids
        assert p3["id"] in ids

    def test_player_ready_toggle(self, client):
        """Toggle ready state and verify."""
        p = _add_player(client, "Alice")
        # Not ready by default
        resp = client.get(f"/player?user_id={p['id']}")
        assert resp.json()["isReady"] is False

        # Toggle to ready
        client.patch(f"/player?target_player_id={p['id']}")
        resp = client.get(f"/player?user_id={p['id']}")
        assert resp.json()["isReady"] is True

        # Toggle back
        client.patch(f"/player?target_player_id={p['id']}")
        resp = client.get(f"/player?user_id={p['id']}")
        assert resp.json()["isReady"] is False

    def test_start_game_with_minimum_players(self, client):
        """Game starts successfully with 2 players."""
        _add_player(client, "Alice")
        _add_player(client, "Bob")

        resp = _start_game(client)
        assert resp.status_code == 200

        # Verify game state changed
        gs = client.get("/game-state")
        assert gs.status_code == 200
        state_data = gs.json()
        assert state_data["state"] == GameState.WAITING_FOR_ACTION.value

    def test_remove_player_before_start(self, client):
        """Player can be removed before game starts."""
        p1 = _add_player(client, "Alice")
        p2 = _add_player(client, "Bob")

        client.delete(f"/player?user_id={p1['id']}")
        players = client.get("/players").json()
        assert len(players) == 1
        assert players[0]["id"] == p2["id"]


# ---------------------------------------------------------------------------
# Full game flow via REST + service layer
# ---------------------------------------------------------------------------

class TestFullGameFlow:
    """Simulate a complete game through HTTP + direct game manipulation."""

    def test_income_flow(self, client):
        """Players alternate income and coins increase."""
        p1 = _add_player(client, "Alice")
        p2 = _add_player(client, "Bob")
        _start_game(client)

        # Alice takes income
        alice = None
        for p in game.get_players():
            if str(p.id) == p1["id"]:
                alice = p
                break
        initial = alice.coins

        game.declare_move(alice.id, GameAction.INCOME)
        assert alice.coins == initial + 1

    def test_full_coup_flow(self, client):
        """Complete Coup action: declare -> no challenge -> influence selection."""
        p1 = _add_player(client, "Alice")
        p2 = _add_player(client, "Bob")
        _start_game(client)

        alice = None
        bob = None
        for p in game.get_players():
            if str(p.id) == p1["id"]:
                alice = p
            elif str(p.id) == p2["id"]:
                bob = p

        # Give Alice 7 coins
        alice.coins = 7

        # Declare coup
        game.declare_move(alice.id, GameAction.COUP, target_id=bob.id)
        assert game.state == GameState.ACTION_DECLARED

        # No challenge
        game.handle_no_challenge()
        assert game.state == GameState.INFLUENCE_SELECTION_PENDING
        assert alice.coins == 0

        # Bob selects a card to lose
        card_to_lose = bob.cards[0]
        game.resolve_influence_selection(bob.id, card_to_lose)
        assert card_to_lose not in bob.cards
        assert game.state == GameState.WAITING_FOR_ACTION

    def test_tax_then_challenge_flow(self, client):
        """Tax declaration followed by a challenge."""
        p1 = _add_player(client, "Alice")
        p2 = _add_player(client, "Bob")
        _start_game(client)

        alice = None
        bob = None
        for p in game.get_players():
            if str(p.id) == p1["id"]:
                alice = p
            elif str(p.id) == p2["id"]:
                bob = p

        # Alice declares tax
        game.declare_move(alice.id, GameAction.TAX)
        assert game.declared_move == GameAction.TAX

        # Bob challenges
        loser_id = game.get_challenge_loser(bob.id)
        assert loser_id is not None
        assert game.state == GameState.CHALLENGE_HANDLE

    def test_exchange_flow(self, client):
        """Exchange declaration -> no challenge -> card selection."""
        p1 = _add_player(client, "Alice")
        p2 = _add_player(client, "Bob")
        _start_game(client)

        alice = None
        for p in game.get_players():
            if str(p.id) == p1["id"]:
                alice = p
                break

        game.declare_move(alice.id, GameAction.EXCHANGE)
        game.handle_no_challenge()

        assert game.state == GameState.PENDING_EXCHANGE
        combined = game.exchange_cards
        assert len(combined) == 4  # 2 original + 2 drawn

        # Alice keeps 2 cards
        chosen = combined[:2]
        game.resolve_exchange(alice.id, chosen)

        assert len(alice.cards) == 2
        assert game.state == GameState.WAITING_FOR_ACTION

    def test_steal_flow(self, client):
        """Steal declaration with target."""
        p1 = _add_player(client, "Alice")
        p2 = _add_player(client, "Bob")
        _start_game(client)

        alice = None
        bob = None
        for p in game.get_players():
            if str(p.id) == p1["id"]:
                alice = p
            elif str(p.id) == p2["id"]:
                bob = p

        bob_initial = bob.coins
        alice_initial = alice.coins

        game.declare_move(alice.id, GameAction.STEAL, target_id=bob.id)
        game.handle_no_challenge()

        # Steal takes up to 2 coins
        stolen = min(2, bob_initial)
        assert bob.coins == bob_initial - stolen
        assert alice.coins == alice_initial + stolen

    def test_assassinate_flow(self, client):
        """Assassinate: declare -> no challenge -> influence selection."""
        p1 = _add_player(client, "Alice")
        p2 = _add_player(client, "Bob")
        _start_game(client)

        alice = None
        bob = None
        for p in game.get_players():
            if str(p.id) == p1["id"]:
                alice = p
            elif str(p.id) == p2["id"]:
                bob = p

        alice.coins = 3
        game.declare_move(alice.id, GameAction.ASSASSINATE, target_id=bob.id)
        game.handle_no_challenge()

        assert game.state == GameState.INFLUENCE_SELECTION_PENDING
        assert alice.coins == 0

        card = bob.cards[0]
        game.resolve_influence_selection(bob.id, card)
        assert card not in bob.cards

    def test_foreign_aid_blocked(self, client):
        """Foreign aid gets blocked by another player."""
        p1 = _add_player(client, "Alice")
        p2 = _add_player(client, "Bob")
        _start_game(client)

        alice = None
        bob = None
        for p in game.get_players():
            if str(p.id) == p1["id"]:
                alice = p
            elif str(p.id) == p2["id"]:
                bob = p

        alice_initial = alice.coins

        game.declare_move(alice.id, GameAction.FOREIGN_AID)
        assert game.declared_move == GameAction.FOREIGN_AID

        # Bob blocks (use BlockMove, not GameAction)
        game.declare_move(bob.id, BlockMove.BLOCK_FOREIGN_AID, blocker_id=bob.id)
        assert game.state == GameState.BLOCK_DECLARED

        # No challenge to the block
        game.handle_no_challenge()
        # Action is cancelled, coins unchanged
        assert alice.coins == alice_initial
        assert game.state == GameState.WAITING_FOR_ACTION

    def test_player_elimination_and_game_over(self, client):
        """Player loses last card -> eliminated -> game over."""
        p1 = _add_player(client, "Alice")
        p2 = _add_player(client, "Bob")
        _start_game(client)

        alice = None
        bob = None
        for p in game.get_players():
            if str(p.id) == p1["id"]:
                alice = p
            elif str(p.id) == p2["id"]:
                bob = p

        alice.coins = 7
        bob.cards = [bob.cards[0]]  # Only 1 card

        game.declare_move(alice.id, GameAction.COUP, target_id=bob.id)
        game.handle_no_challenge()
        game.resolve_influence_selection(bob.id, bob.cards[0])

        assert bob.id not in game.players
        assert game.state == GameState.GAME_OVER


# ---------------------------------------------------------------------------
# Game state via REST endpoints
# ---------------------------------------------------------------------------

class TestGameStateEndpoints:
    """Verify game state REST endpoints reflect actual game state."""

    def test_game_state_after_start(self, client):
        """GET /game-state returns valid data after game starts."""
        _add_player(client, "Alice")
        _add_player(client, "Bob")
        _start_game(client)

        resp = client.get("/game-state")
        assert resp.status_code == 200
        data = resp.json()
        assert "state" in data
        assert "playersState" in data
        assert "cardsInDeck" in data
        assert len(data["playersState"]) == 2

    def test_user_player_after_start(self, client):
        """GET /user-player returns player details after game starts."""
        p = _add_player(client, "Alice")
        _add_player(client, "Bob")
        _start_game(client)

        resp = client.get(f"/user-player?user_id={p['id']}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Alice"
        assert "cards" in data
        assert "coins" in data
        assert len(data["cards"]) == 2

    def test_game_state_tracks_turns(self, client):
        """Game state currentTurn updates after moves."""
        p1 = _add_player(client, "Alice")
        p2 = _add_player(client, "Bob")
        _start_game(client)

        alice = None
        for pl in game.get_players():
            if str(pl.id) == p1["id"]:
                alice = pl
                break

        # Check initial turn
        resp = client.get("/game-state")
        initial_turn = resp.json().get("currentTurn", {}).get("id")

        # Alice takes income
        game.declare_move(alice.id, GameAction.INCOME)

        resp = client.get("/game-state")
        new_turn = resp.json().get("currentTurn", {}).get("id")
        assert initial_turn != new_turn


# ---------------------------------------------------------------------------
# Error scenarios
# ---------------------------------------------------------------------------

class TestErrorScenarios:
    """Edge cases and error conditions."""

    def test_start_game_with_one_player(self, client):
        """Starting with 1 player should fail with a server error."""
        _add_player(client, "Alice")
        resp = _start_game(client)
        # PlayerInsufficientError is unhandled, results in 500
        assert resp.status_code == 500

    def test_add_six_players(self, client):
        """Can add up to 6 players."""
        for i in range(6):
            resp = client.post(f"/player?player_name=P{i}")
            assert resp.status_code == 200

    def test_add_seventh_player_fails(self, client):
        """Cannot add more than 6 players — raises ValueError (500)."""
        for i in range(6):
            client.post(f"/player?player_name=P{i}")
        resp = client.post("/player?player_name=P6")
        # CoupGame.add_player raises ValueError, unhandled → 500
        assert resp.status_code == 500

    def test_duplicate_player_names(self, client):
        """Duplicate names are allowed (IDs are unique)."""
        p1 = _add_player(client, "Alice")
        p2 = _add_player(client, "Alice")
        assert p1["id"] != p2["id"]

        players = client.get("/players").json()
        assert len(players) == 2
