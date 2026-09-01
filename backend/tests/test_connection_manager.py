import pytest
import asyncio
from unittest.mock import AsyncMock
from uuid import uuid4
from services.ConnectionManager import ConnectionManager


pytestmark = pytest.mark.unit


@pytest.fixture
def manager():
    return ConnectionManager()


@pytest.fixture
def mock_websocket():
    ws = AsyncMock()
    ws.send_json = AsyncMock()
    return ws


def run_async(coro):
    """Helper to run async functions in tests."""
    return asyncio.get_event_loop().run_until_complete(coro)


class TestConnectionManagerInit:
    def test_initial_connections_empty(self, manager):
        assert manager.active_connections == {}

    def test_initial_connections_is_dict(self, manager):
        assert isinstance(manager.active_connections, dict)


class TestConnect:
    def test_connect_adds_connection(self, manager, mock_websocket):
        pid = uuid4()
        run_async(manager.connect(mock_websocket, pid, players_state=[]))
        assert pid in manager.active_connections
        assert manager.active_connections[pid] is mock_websocket

    def test_connect_accepts_websocket(self, manager, mock_websocket):
        pid = uuid4()
        run_async(manager.connect(mock_websocket, pid, players_state=[]))
        mock_websocket.accept.assert_awaited_once()

    def test_connect_broadcasts_players_state_to_others(self, manager):
        """connect broadcasts players_state to OTHER players, not the connecting player."""
        existing_ws = AsyncMock()
        existing_pid = uuid4()
        manager.active_connections[existing_pid] = existing_ws

        new_ws = AsyncMock()
        new_pid = uuid4()
        players = [{"name": "Alice"}, {"name": "Bob"}]
        run_async(manager.connect(new_ws, new_pid, players_state=players))

        # The existing player should receive the broadcast
        existing_ws.send_json.assert_awaited_with({"action": "connect", "players": players})
        # The new player should NOT receive (broadcast excludes sender)
        new_ws.send_json.assert_not_awaited()

    def test_connect_broadcasts_chats_to_others(self, manager):
        existing_ws = AsyncMock()
        existing_pid = uuid4()
        manager.active_connections[existing_pid] = existing_ws

        new_ws = AsyncMock()
        new_pid = uuid4()
        chats = [{"message": "hello"}]
        run_async(manager.connect(new_ws, new_pid, chats=chats))

        existing_ws.send_json.assert_awaited_with(chats)
        new_ws.send_json.assert_not_awaited()

    def test_connect_broadcasts_game_state_to_others(self, manager):
        existing_ws = AsyncMock()
        existing_pid = uuid4()
        manager.active_connections[existing_pid] = existing_ws

        new_ws = AsyncMock()
        new_pid = uuid4()
        state = {"state": "WAITING_FOR_ACTION"}
        run_async(manager.connect(new_ws, new_pid, game_state=state))

        existing_ws.send_json.assert_awaited_with(state)
        new_ws.send_json.assert_not_awaited()

    def test_connect_broadcasts_multiple_data_types(self, manager):
        existing_ws = AsyncMock()
        existing_pid = uuid4()
        manager.active_connections[existing_pid] = existing_ws

        new_ws = AsyncMock()
        new_pid = uuid4()
        players = [{"name": "Alice"}]
        chats = [{"message": "hi"}]
        state = {"state": "PLAYING"}
        run_async(manager.connect(new_ws, new_pid, players_state=players, chats=chats, game_state=state))

        assert existing_ws.send_json.await_count == 3

    def test_connect_raises_when_no_data_provided(self, manager, mock_websocket):
        pid = uuid4()
        with pytest.raises(ValueError, match="At least one of"):
            run_async(manager.connect(mock_websocket, pid))

    def test_connect_no_existing_players(self, manager):
        """When connecting as the first player, no one receives the broadcast."""
        new_ws = AsyncMock()
        new_pid = uuid4()
        run_async(manager.connect(new_ws, new_pid, players_state=[{"name": "Alice"}]))
        # No one else to broadcast to
        new_ws.send_json.assert_not_awaited()
        assert new_pid in manager.active_connections


class TestDisconnect:
    def test_disconnect_removes_connection(self, manager, mock_websocket):
        pid = uuid4()
        manager.active_connections[pid] = mock_websocket
        manager.disconnect(pid)
        assert pid not in manager.active_connections

    def test_disconnect_nonexistent_player_no_error(self, manager):
        manager.disconnect(uuid4())

    def test_disconnect_only_removes_specified_player(self, manager, mock_websocket):
        pid1 = uuid4()
        pid2 = uuid4()
        ws2 = AsyncMock()
        manager.active_connections[pid1] = mock_websocket
        manager.active_connections[pid2] = ws2
        manager.disconnect(pid1)
        assert pid1 not in manager.active_connections
        assert pid2 in manager.active_connections


class TestSendPersonalMessage:
    def test_send_personal_message_success(self, manager, mock_websocket):
        pid = uuid4()
        manager.active_connections[pid] = mock_websocket
        msg = {"action": "test", "data": 123}
        run_async(manager.send_personal_message(pid, msg))
        mock_websocket.send_json.assert_awaited_once_with(msg)

    def test_send_personal_message_raises_for_unknown_player(self, manager):
        with pytest.raises(ValueError, match="No active connection"):
            run_async(manager.send_personal_message(uuid4(), {"msg": "test"}))

    def test_send_personal_message_removes_dead_connection(self, manager, mock_websocket):
        pid = uuid4()
        mock_websocket.send_json.side_effect = RuntimeError("Connection closed")
        manager.active_connections[pid] = mock_websocket
        run_async(manager.send_personal_message(pid, {"msg": "test"}))
        assert pid not in manager.active_connections

    def test_send_personal_message_sends_list(self, manager, mock_websocket):
        pid = uuid4()
        manager.active_connections[pid] = mock_websocket
        msg = [1, 2, 3]
        run_async(manager.send_personal_message(pid, msg))
        mock_websocket.send_json.assert_awaited_once_with(msg)


class TestBroadcast:
    def test_broadcast_sends_to_all_except_sender(self, manager):
        sender = uuid4()
        recipient1 = uuid4()
        recipient2 = uuid4()
        ws1 = AsyncMock()
        ws2 = AsyncMock()
        manager.active_connections = {sender: AsyncMock(), recipient1: ws1, recipient2: ws2}

        msg = {"action": "update"}
        run_async(manager.broadcast(sender, msg))

        ws1.send_json.assert_awaited_once_with(msg)
        ws2.send_json.assert_awaited_once_with(msg)

    def test_broadcast_does_not_send_to_sender(self, manager):
        sender = uuid4()
        sender_ws = AsyncMock()
        manager.active_connections = {sender: sender_ws}

        run_async(manager.broadcast(sender, {"msg": "test"}))
        sender_ws.send_json.assert_not_awaited()

    def test_broadcast_removes_dead_connections(self, manager):
        sender = uuid4()
        dead = uuid4()
        alive = uuid4()
        dead_ws = AsyncMock()
        dead_ws.send_json.side_effect = RuntimeError("dead")
        alive_ws = AsyncMock()
        manager.active_connections = {sender: AsyncMock(), dead: dead_ws, alive: alive_ws}

        run_async(manager.broadcast(sender, {"msg": "test"}))

        assert dead not in manager.active_connections
        assert alive in manager.active_connections

    def test_broadcast_empty_recipients(self, manager):
        sender = uuid4()
        manager.active_connections = {sender: AsyncMock()}
        run_async(manager.broadcast(sender, {"msg": "test"}))

    def test_broadcast_sends_list_message(self, manager):
        sender = uuid4()
        recipient = uuid4()
        ws = AsyncMock()
        manager.active_connections = {sender: AsyncMock(), recipient: ws}

        msg = [{"action": "chat"}, {"action": "state"}]
        run_async(manager.broadcast(sender, msg))
        ws.send_json.assert_awaited_once_with(msg)

    def test_broadcast_all_dead_connections(self, manager):
        sender = uuid4()
        dead1 = uuid4()
        dead2 = uuid4()
        ws1 = AsyncMock()
        ws1.send_json.side_effect = RuntimeError("dead")
        ws2 = AsyncMock()
        ws2.send_json.side_effect = RuntimeError("dead")
        manager.active_connections = {sender: AsyncMock(), dead1: ws1, dead2: ws2}

        run_async(manager.broadcast(sender, {"msg": "test"}))

        assert dead1 not in manager.active_connections
        assert dead2 not in manager.active_connections
