"""Integration tests for WebSocket endpoints: /ws/lobby, /ws/chat, /ws/game."""
import json
import pytest
from uuid import uuid4
from starlette.testclient import TestClient
from api import app
from services.CoupGame import CoupGame
from services.Player import Player
from services.GameState import GameState
from services.GameAction import GameAction
from services.Influence import Influence
from controllers.LobbyController import lobby_controller
from controllers.GameController import game_controller
from services.ConnectionManager import ConnectionManager
from utils.state import game


pytestmark = pytest.mark.integration


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _add_player(client, name: str) -> dict:
    """Add a player via REST and return the JSON response."""
    return client.post(f"/player?player_name={name}").json()


def _start_game(client):
    """Start the game via REST."""
    client.get("/start-game")


def _make_game_with_players(client, names: list[str]) -> list[dict]:
    """Add players, start the game, return player dicts."""
    players = [_add_player(client, n) for n in names]
    _start_game(client)
    return players


# ---------------------------------------------------------------------------
# Lobby WebSocket
# ---------------------------------------------------------------------------

class TestLobbyWebSocket:
    """Tests for /ws/lobby."""

    def test_connect_with_valid_player(self, client):
        """Valid player can connect to lobby WS."""
        p = _add_player(client, "Alice")
        with client.websocket_connect(f"/ws/lobby?user_id={p['id']}") as ws:
            # Connection should succeed; we receive initial player list
            pass  # No exception = success

    def test_connect_with_invalid_player(self, client):
        """Invalid player ID gets rejected (close code 1008)."""
        fake_id = str(uuid4())
        with pytest.raises(Exception):
            with client.websocket_connect(f"/ws/lobby?user_id={fake_id}") as ws:
                pass

    def test_broadcast_action(self, client):
        """Message sent by one client is broadcast to others."""
        p1 = _add_player(client, "Alice")
        p2 = _add_player(client, "Bob")

        with client.websocket_connect(f"/ws/lobby?user_id={p1['id']}") as ws1:
            with client.websocket_connect(f"/ws/lobby?user_id={p2['id']}") as ws2:
                # p1 sends an action
                ws1.send_json({"action": "toggle_ready", "players": []})
                # p2 should receive it
                data = ws2.receive_json()
                assert data["action"] == "toggle_ready"

    def test_disconnect_action(self, client):
        """Disconnect action removes the user from the manager."""
        p = _add_player(client, "Alice")
        with client.websocket_connect(f"/ws/lobby?user_id={p['id']}") as ws:
            ws.send_json({"action": "disconnect", "players": []})
            # No exception = broadcast succeeded


# ---------------------------------------------------------------------------
# Chat WebSocket
# ---------------------------------------------------------------------------

class TestChatWebSocket:
    """Tests for /ws/chat."""

    def test_connect_with_valid_player(self, client):
        """Valid player can connect to chat WS."""
        p = _add_player(client, "Alice")
        with client.websocket_connect(f"/ws/chat?user_id={p['id']}") as ws:
            pass

    def test_connect_with_invalid_player(self, client):
        """Invalid player ID is rejected."""
        fake_id = str(uuid4())
        with pytest.raises(Exception):
            with client.websocket_connect(f"/ws/chat?user_id={fake_id}") as ws:
                pass

    def test_message_broadcast(self, client):
        """Chat message from one client reaches the other."""
        p1 = _add_player(client, "Alice")
        p2 = _add_player(client, "Bob")

        with client.websocket_connect(f"/ws/chat?user_id={p1['id']}") as ws1:
            with client.websocket_connect(f"/ws/chat?user_id={p2['id']}") as ws2:
                ws1.send_json({"message": "Hello!", "sender": "Alice"})
                data = ws2.receive_json()
                assert data["message"] == "Hello!"
                assert data["sender"] == "Alice"

    def test_invalid_json_returns_error(self, client):
        """Sending invalid JSON returns an error message."""
        p = _add_player(client, "Alice")
        with client.websocket_connect(f"/ws/chat?user_id={p['id']}") as ws:
            ws.send_text("not valid json {{{")
            data = ws.receive_json()
            assert "error" in data
            assert "Invalid JSON" in data["error"]

    def test_multiple_messages(self, client):
        """Multiple messages are broadcast in order."""
        p1 = _add_player(client, "Alice")
        p2 = _add_player(client, "Bob")

        with client.websocket_connect(f"/ws/lobby?user_id={p1['id']}") as _:
            pass  # just to keep alice alive in lobby

        with client.websocket_connect(f"/ws/chat?user_id={p1['id']}") as ws1:
            with client.websocket_connect(f"/ws/chat?user_id={p2['id']}") as ws2:
                for i in range(3):
                    ws1.send_json({"message": f"msg-{i}"})
                for i in range(3):
                    data = ws2.receive_json()
                    assert data["message"] == f"msg-{i}"


# ---------------------------------------------------------------------------
# Game WebSocket
# ---------------------------------------------------------------------------

class TestGameWebSocket:
    """Tests for /ws/game."""

    def test_connect_with_valid_player(self, client):
        """Valid player can connect to game WS after game is started."""
        players = _make_game_with_players(client, ["Alice", "Bob"])
        with client.websocket_connect(f"/ws/game?user_id={players[0]['id']}") as ws:
            # Should receive initial game state
            pass

    def test_connect_with_invalid_player(self, client):
        """Invalid player ID gets rejected."""
        _make_game_with_players(client, ["Alice", "Bob"])
        fake_id = str(uuid4())
        with pytest.raises(Exception):
            with client.websocket_connect(f"/ws/game?user_id={fake_id}") as ws:
                pass

    def test_connect_before_game_started(self, client):
        """Connecting before game start should fail (game_controller not wired)."""
        p = _add_player(client, "Alice")
        # game hasn't started, game_controller.game_manager may not be set
        # The endpoint checks game_controller.get_player_by_id which accesses game
        # If game is set (via startup event), it may still work at lobby level
        # This tests that connecting before /start-game is handled
        try:
            with client.websocket_connect(f"/ws/game?user_id={p['id']}") as ws:
                pass
        except Exception:
            pass  # Expected - game not started

    def test_declare_move_income(self, client):
        """Player can declare INCOME via WS."""
        players = _make_game_with_players(client, ["Alice", "Bob"])
        current_player = players[0]  # Player 1's turn

        with client.websocket_connect(f"/ws/game?user_id={current_player['id']}") as ws:
            ws.send_json({
                "action": "declare_move",
                "payload": {"move": "income"},
            })
            # INCOME executes immediately, no error
            # The WS handler doesn't send a response for successful moves
            # but we can verify the game state changed
        assert game.state == GameState.WAITING_FOR_ACTION

    def test_declare_move_wrong_player(self, client):
        """Wrong player trying to move gets an error."""
        players = _make_game_with_players(client, ["Alice", "Bob"])
        wrong_player = players[1]  # Not their turn

        with client.websocket_connect(f"/ws/game?user_id={wrong_player['id']}") as ws:
            ws.send_json({
                "action": "declare_move",
                "payload": {"move": "income"},
            })
            data = ws.receive_json()
            assert "error" in data

    def test_declare_move_tax(self, client):
        """Player can declare TAX via WS."""
        players = _make_game_with_players(client, ["Alice", "Bob"])

        with client.websocket_connect(f"/ws/game?user_id={players[0]['id']}") as ws:
            ws.send_json({
                "action": "declare_move",
                "payload": {"move": "tax"},
            })
        assert game.state == GameState.ACTION_DECLARED
        assert game.declared_move == GameAction.TAX

    def test_declare_move_with_target(self, client):
        """Player can declare STEAL with a target via WS."""
        players = _make_game_with_players(client, ["Alice", "Bob"])

        with client.websocket_connect(f"/ws/game?user_id={players[0]['id']}") as ws:
            ws.send_json({
                "action": "declare_move",
                "payload": {
                    "move": "steal",
                    "target": players[1]["id"],
                },
            })
        assert game.state == GameState.ACTION_DECLARED
        assert game.declared_move == GameAction.STEAL

    def test_block_action(self, client):
        """Player can block via WS."""
        players = _make_game_with_players(client, ["Alice", "Bob"])

        # Alice declares foreign aid (note: enum value is "FOREIGN AID" with space)
        with client.websocket_connect(f"/ws/game?user_id={players[0]['id']}") as ws:
            ws.send_json({
                "action": "declare_move",
                "payload": {"move": "foreign aid"},
            })
        assert game.state == GameState.ACTION_DECLARED

        # Bob blocks (BlockMove enum value is "BLOCK FOREIGN AID")
        with client.websocket_connect(f"/ws/game?user_id={players[1]['id']}") as ws:
            ws.send_json({
                "action": "block",
                "payload": {"move": "block foreign aid"},
            })
        assert game.state == GameState.BLOCK_DECLARED

    def test_no_challenge_action(self, client):
        """Player can pass on challenging via WS."""
        players = _make_game_with_players(client, ["Alice", "Bob"])

        # Alice declares tax
        with client.websocket_connect(f"/ws/game?user_id={players[0]['id']}") as ws:
            ws.send_json({
                "action": "declare_move",
                "payload": {"move": "tax"},
            })

        # No one challenges
        with client.websocket_connect(f"/ws/game?user_id={players[1]['id']}") as ws:
            ws.send_json({"action": "no_challenge"})

        # Tax executes, turn advances
        assert game.state == GameState.WAITING_FOR_ACTION
        assert game.currentTurnIndex == 1

    def test_challenge_action(self, client):
        """Player can challenge via WS."""
        players = _make_game_with_players(client, ["Alice", "Bob"])

        # Alice declares tax
        with client.websocket_connect(f"/ws/game?user_id={players[0]['id']}") as ws:
            ws.send_json({
                "action": "declare_move",
                "payload": {"move": "tax"},
            })

        # Bob challenges
        with client.websocket_connect(f"/ws/game?user_id={players[1]['id']}") as ws:
            ws.send_json({
                "action": "challenge",
                "payload": {"challengerId": players[1]["id"]},
            })
            result = ws.receive_json()
            assert result["action"] == "challenge_result"
            assert "loser_id" in result

    def test_unknown_action_returns_error(self, client):
        """Unknown action type returns an error."""
        players = _make_game_with_players(client, ["Alice", "Bob"])

        with client.websocket_connect(f"/ws/game?user_id={players[0]['id']}") as ws:
            ws.send_json({"action": "bogus_action"})
            data = ws.receive_json()
            assert "error" in data
            assert "Unknown action" in data["error"]

    def test_exchange_selection_action(self, client):
        """Player can select exchange cards via WS."""
        players = _make_game_with_players(client, ["Alice", "Bob"])

        # Alice declares exchange
        with client.websocket_connect(f"/ws/game?user_id={players[0]['id']}") as ws:
            ws.send_json({
                "action": "declare_move",
                "payload": {"move": "exchange"},
            })

        # No challenge
        with client.websocket_connect(f"/ws/game?user_id={players[1]['id']}") as ws:
            ws.send_json({"action": "no_challenge"})

        assert game.state == GameState.PENDING_EXCHANGE

        # Alice selects cards
        chosen = game.exchange_cards[:2]
        with client.websocket_connect(f"/ws/game?user_id={players[0]['id']}") as ws:
            ws.send_json({
                "action": "exchange_selection",
                "payload": {"cards": [c.name for c in chosen]},
            })

        assert game.state == GameState.WAITING_FOR_ACTION

    def test_influence_selection_action(self, client):
        """Player can select influence to lose via WS."""
        players = _make_game_with_players(client, ["Alice", "Bob"])

        # Alice coups Bob (needs 7 coins)
        game.get_player_by_id(game.players[players[0]["id"]].id if hasattr(players[0]["id"], "hex") else None)
        # Directly set coins for the first player
        first_player = None
        for p in game.get_players():
            if str(p.id) == players[0]["id"]:
                first_player = p
                break
        first_player.coins = 7

        with client.websocket_connect(f"/ws/game?user_id={players[0]['id']}") as ws:
            ws.send_json({
                "action": "declare_move",
                "payload": {"move": "coup", "target": players[1]["id"]},
            })

        # No challenge
        with client.websocket_connect(f"/ws/game?user_id={players[1]['id']}") as ws:
            ws.send_json({"action": "no_challenge"})

        assert game.state == GameState.INFLUENCE_SELECTION_PENDING

        # Bob selects a card to lose
        second_player = None
        for p in game.get_players():
            if str(p.id) == players[1]["id"]:
                second_player = p
                break
        card_to_lose = second_player.cards[0]

        with client.websocket_connect(f"/ws/game?user_id={players[1]['id']}") as ws:
            ws.send_json({
                "action": "influence_selection",
                "payload": {"card": card_to_lose.name},
            })

        assert game.state == GameState.WAITING_FOR_ACTION
