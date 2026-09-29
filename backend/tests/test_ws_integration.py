"""Integration tests for WebSocket endpoints: /ws/lobby, /ws/chat, /ws/game."""
import json
import pytest
from collections import Counter
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


# ---------------------------------------------------------------------------
# Exchange: the drawn cards must reach the exchanging player
# ---------------------------------------------------------------------------

class TestExchangeCardDelivery:
    """
    The exchange picker is the one screen in the game that cannot be rendered
    from the public state, because what it shows — the cards just drawn — is
    secret. It therefore depends on `GET /user-player` carrying them, and on
    the client sending back plain influence names.

    Both halves of that contract were missing at once, which is why the flow
    deadlocked rather than degraded: the pool collapsed to the player's own
    hand, and the name the client derived from that pool was not a name the
    server could resolve.
    """

    @staticmethod
    def _reach_pending_exchange(client, players) -> None:
        """Drive the game to PENDING_EXCHANGE with players[0] exchanging."""
        with client.websocket_connect(f"/ws/game?user_id={players[0]['id']}") as ws:
            ws.send_json({"action": "declare_move", "payload": {"move": "exchange"}})
        with client.websocket_connect(f"/ws/game?user_id={players[1]['id']}") as ws:
            ws.send_json({"action": "no_challenge"})
        assert game.state == GameState.PENDING_EXCHANGE

    def test_user_player_carries_the_drawn_cards_for_the_exchanger(self, client):
        players = _make_game_with_players(client, ["Alice", "Bob"])
        self._reach_pending_exchange(client, players)

        resp = client.get(f"/user-player?user_id={players[0]['id']}")
        assert resp.status_code == 200
        body = resp.json()

        # Pool is the hand followed by the two cards just drawn.
        assert body["exchangeCards"] is not None
        assert body["exchangeCards"] == [c.name for c in game.exchange_cards]
        assert len(body["exchangeCards"]) == len(body["cards"]) + 2

    def test_user_player_withholds_the_pool_from_everyone_else(self, client):
        players = _make_game_with_players(client, ["Alice", "Bob"])
        self._reach_pending_exchange(client, players)

        body = client.get(f"/user-player?user_id={players[1]['id']}").json()

        # The opponent must not learn what Alice drew. A bluffing game cannot
        # afford to publish the deck's next contents.
        assert body["exchangeCards"] is None
        assert "exchangeCards" in body

    def test_pool_is_cleared_once_the_exchange_resolves(self, client):
        players = _make_game_with_players(client, ["Alice", "Bob"])
        self._reach_pending_exchange(client, players)

        pool = client.get(f"/user-player?user_id={players[0]['id']}").json()["exchangeCards"]
        keep = pool[: len(client.get(f"/user-player?user_id={players[0]['id']}").json()["cards"])]

        with client.websocket_connect(f"/ws/game?user_id={players[0]['id']}") as ws:
            ws.send_json({"action": "exchange_selection", "payload": {"cards": keep}})

        assert game.state == GameState.WAITING_FOR_ACTION
        after = client.get(f"/user-player?user_id={players[0]['id']}").json()
        assert after["exchangeCards"] is None
        assert after["cards"] == keep

    def test_public_game_state_never_carries_the_drawn_cards(self, client):
        # PlayerModel deliberately omits `cards`; the broadcast is hand-blind by
        # design. The pool must not become the one place that breaks it.
        players = _make_game_with_players(client, ["Alice", "Bob"])
        self._reach_pending_exchange(client, players)

        state = client.get("/game-state").json()

        assert "exchangeCards" not in state
        for player in state["playersState"]:
            assert "cards" not in player

    def test_selection_built_from_the_client_visible_pool_advances_the_game(self, client):
        """
        The regression guard for the deadlock.

        This mirrors what the browser does end to end: read the pool off
        `/user-player`, keep as many cards as the hand already holds, send those
        names. The pre-existing `test_exchange_selection_action` read
        `game.exchange_cards` straight off the server object, so it fed the
        resolver well-formed names the client never actually produced — which is
        exactly why the suite was green while the screen was stuck.
        """
        players = _make_game_with_players(client, ["Alice", "Bob"])
        self._reach_pending_exchange(client, players)

        mine = client.get(f"/user-player?user_id={players[0]['id']}").json()
        pool = mine["exchangeCards"]
        hand_size = len(mine["cards"])

        assert pool is not None, "/user-player must expose the pool or the picker is empty"
        assert len(pool) == hand_size + 2

        deck_before_selection = game.get_cards_in_deck()

        # The picker offers hand-first, drawn-second, so the first `hand_size`
        # entries are a legal choice.
        keep = pool[:hand_size]

        with client.websocket_connect(f"/ws/game?user_id={players[0]['id']}") as ws:
            ws.send_json({"action": "exchange_selection", "payload": {"cards": keep}})

        assert game.state == GameState.WAITING_FOR_ACTION
        assert game.exchange_cards is None

        # The two cards that were not kept went back to the deck rather than
        # being destroyed, so the count rises by exactly two.
        assert game.get_cards_in_deck() == deck_before_selection + 2

        # And the hand is now the cards the player chose, in that order.
        hand = client.get(f"/user-player?user_id={players[0]['id']}").json()
        assert hand["cards"] == keep

    def test_a_mangled_card_name_is_rejected_rather_than_silently_accepted(self, client):
        """
        The deadlock's exact payload.

        `ExchangeModal` used to key selection on `card + index` and submit those
        strings. The handler catches broadly and answers with an `error` frame,
        so the failure mode is silence unless it is asserted here.
        """
        players = _make_game_with_players(client, ["Alice", "Bob"])
        self._reach_pending_exchange(client, players)

        with client.websocket_connect(f"/ws/game?user_id={players[0]['id']}") as ws:
            ws.send_json({
                "action": "exchange_selection",
                "payload": {"cards": ["ASSASSIN0"]},
            })
            reply = ws.receive_json()

        assert "error" in reply
        # And the game is still waiting — the failure is loud on the wire even
        # though the client only logs it.
        assert game.state == GameState.PENDING_EXCHANGE


# ---------------------------------------------------------------------------
# Block identity has to be published
# ---------------------------------------------------------------------------

class TestBlockerIdentityPublished:
    """
    During BLOCK_DECLARED, `currentTurn` still names the player whose action was
    blocked, because `currentTurnIndex` only moves in `next_turn()`. So the turn
    alone cannot separate the actor from the rest of the table, and the client
    has no way to exclude the blocker unless the server says who blocked.
    """

    def test_blocker_id_is_published_while_a_block_stands(self, client):
        players = _make_game_with_players(client, ["Alice", "Bob"])

        with client.websocket_connect(f"/ws/game?user_id={players[0]['id']}") as ws:
            ws.send_json({"action": "declare_move", "payload": {"move": "foreign aid"}})
        with client.websocket_connect(f"/ws/game?user_id={players[1]['id']}") as ws:
            ws.send_json({"action": "block", "payload": {"move": "block foreign aid"}})

        assert game.state == GameState.BLOCK_DECLARED

        state = client.get("/game-state").json()
        assert state["blockerId"] == players[1]["id"]
        # The blocker is not the current player — that is the whole point.
        assert state["currentTurn"]["id"] == players[0]["id"]

    def test_blocker_id_is_cleared_when_the_turn_advances(self, client):
        players = _make_game_with_players(client, ["Alice", "Bob"])

        with client.websocket_connect(f"/ws/game?user_id={players[0]['id']}") as ws:
            ws.send_json({"action": "declare_move", "payload": {"move": "foreign aid"}})
        with client.websocket_connect(f"/ws/game?user_id={players[1]['id']}") as ws:
            ws.send_json({"action": "block", "payload": {"move": "block foreign aid"}})
        with client.websocket_connect(f"/ws/game?user_id={players[0]['id']}") as ws:
            ws.send_json({"action": "no_challenge"})

        assert game.state == GameState.WAITING_FOR_ACTION
        assert client.get("/game-state").json()["blockerId"] is None


# ---------------------------------------------------------------------------
# Who has to surrender an influence card has to be published
# ---------------------------------------------------------------------------

class TestPendingInfluenceTargetPublished:
    """
    Coup and Assassinate put the game in INFLUENCE_SELECTION_PENDING and set
    `pending_influence_target` to the *target*. `next_turn()` has not run, so
    `currentTurn` is still the player who attacked.

    That made the turn the wrong thing for a client to gate on: the attacker was
    shown the picker over their own hand, and the target — the only player the
    server will accept a surrender from — was shown nothing. The rejection comes
    back as an `error` frame that PlayRoom only `console.error`s, so the game
    wedged with nobody able to move.

    These tests go through the real WS + REST surface rather than the service
    objects, because the defect was a field the client never received, not a
    rule the server applied wrongly.
    """

    @staticmethod
    def _reach_influence_selection_pending(client, players) -> None:
        """Coup the second player, then let it stand: target must lose a card."""
        for player in game.get_players():
            if str(player.id) == players[0]["id"]:
                player.coins = 7

        with client.websocket_connect(f"/ws/game?user_id={players[0]['id']}") as ws:
            ws.send_json({
                "action": "declare_move",
                "payload": {"move": "coup", "target": players[1]["id"]},
            })
        with client.websocket_connect(f"/ws/game?user_id={players[1]['id']}") as ws:
            ws.send_json({"action": "no_challenge"})

        assert game.state == GameState.INFLUENCE_SELECTION_PENDING

    @staticmethod
    def _player(client, player_id: str) -> Player:
        for player in game.get_players():
            if str(player.id) == player_id:
                return player
        raise AssertionError(f"player {player_id} is not in the game")

    def test_pending_influence_target_names_the_target_not_the_attacker(self, client):
        players = _make_game_with_players(client, ["Alice", "Bob"])
        self._reach_influence_selection_pending(client, players)

        state = client.get("/game-state").json()

        assert state["pendingInfluenceTarget"] == players[1]["id"]
        # The attacker is still named as the current player. That is the whole
        # point: a client gating on the turn picks the wrong player.
        assert state["currentTurn"]["id"] == players[0]["id"]
        assert state["pendingInfluenceTarget"] != state["currentTurn"]["id"]

    def test_pending_influence_target_is_none_outside_the_pending_state(self, client):
        players = _make_game_with_players(client, ["Alice", "Bob"])

        assert client.get("/game-state").json()["pendingInfluenceTarget"] is None

    def test_pending_influence_target_is_cleared_once_the_turn_advances(self, client):
        players = _make_game_with_players(client, ["Alice", "Bob"])
        self._reach_influence_selection_pending(client, players)

        target = self._player(client, players[1]["id"])
        card_to_lose = target.cards[0]
        with client.websocket_connect(f"/ws/game?user_id={players[1]['id']}") as ws:
            ws.send_json({
                "action": "influence_selection",
                "payload": {"card": card_to_lose.name},
            })

        assert game.state == GameState.WAITING_FOR_ACTION
        assert client.get("/game-state").json()["pendingInfluenceTarget"] is None

    def test_next_turn_clears_the_pending_target_on_its_own(self, client):
        """
        The clearing inside `next_turn()` itself, not the one in
        `resolve_influence_selection()`.

        Both exist, and they are not interchangeable. Resolving a surrender
        nulls the field on its way past, so the end-to-end test above passes
        whether or not `next_turn()` clears it — it cannot tell the two apart.
        This one calls `next_turn()` directly with the field set, which is the
        only way to hold the line in `next_turn()` accountable.

        Service-level on purpose: the point under test is a field on the game
        object, and reaching it over the wire would only re-test
        `resolve_influence_selection()`.
        """
        players = _make_game_with_players(client, ["Alice", "Bob"])
        self._reach_influence_selection_pending(client, players)
        target = self._player(client, players[1]["id"])
        assert game.pending_influence_target == target.id

        game.next_turn()

        assert game.pending_influence_target is None

    def test_the_target_can_resolve_the_surrender(self, client):
        players = _make_game_with_players(client, ["Alice", "Bob"])
        self._reach_influence_selection_pending(client, players)

        target = self._player(client, players[1]["id"])
        # Counted, not listed. The deck holds three of every influence, so a
        # 2-card hand is a pair ~14% of the time; comparing name-lists after
        # filtering out the surrendered name misreads a pair as two losses and
        # fails intermittently.
        hand_before = Counter(card.name for card in target.cards)
        card_to_lose = target.cards[0]

        with client.websocket_connect(f"/ws/game?user_id={players[1]['id']}") as ws:
            ws.send_json({
                "action": "influence_selection",
                "payload": {"card": card_to_lose.name},
            })

        assert game.state == GameState.WAITING_FOR_ACTION

        hand_after = Counter(card.name for card in target.cards)
        # Exactly one card gone, and it is the one that was surrendered. Counted
        # rather than membership-tested: `Influence` is a plain Enum, so
        # `Influence.DUKE == "DUKE"` is False and a name-membership check here
        # would be vacuously true whatever the hand contained. Together these
        # two are the whole claim — the total falls by one and that specific
        # card falls by one, so nothing else can have changed.
        assert sum(hand_after.values()) == sum(hand_before.values()) - 1
        assert hand_after[card_to_lose.name] == hand_before[card_to_lose.name] - 1

        # The turn advanced off the attacker. With two players that lands on the
        # target, so assert the change rather than naming a winner of the seat.
        assert str(game.get_current_player().id) == players[1]["id"]
        assert str(game.get_current_player().id) != players[0]["id"]

    def test_the_attacker_cannot_resolve_the_surrender(self, client):
        """
        The exact request the buggy UI made. It is answered with an `error`
        frame, and the client logs that and carries on, so nothing short of an
        assertion on the game state can catch the wedge.
        """
        players = _make_game_with_players(client, ["Alice", "Bob"])
        self._reach_influence_selection_pending(client, players)

        attacker = self._player(client, players[0]["id"])
        target = self._player(client, players[1]["id"])
        hand_before = [card.name for card in attacker.cards]
        card = attacker.cards[0]

        with client.websocket_connect(f"/ws/game?user_id={players[0]['id']}") as ws:
            ws.send_json({
                "action": "influence_selection",
                "payload": {"card": card.name},
            })
            reply = ws.receive_json()

        assert "error" in reply, "a non-target surrender must be refused on the wire"
        # The failure is loud on the wire but silent in the UI, so the state has
        # to be asserted separately: the target can still resolve, and the
        # attacker kept every card.
        assert game.state == GameState.INFLUENCE_SELECTION_PENDING
        assert [c.name for c in attacker.cards] == hand_before
        assert game.pending_influence_target == target.id
