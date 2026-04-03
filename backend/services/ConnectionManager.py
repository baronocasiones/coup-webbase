from fastapi import WebSocket
from uuid import UUID
from typing import Optional


class ConnectionManager:
    """Manages WebSocket connections for real-time communication between players."""

    def __init__(self):
        self.active_connections: dict[UUID, WebSocket] = {}

    async def connect(self,
                      websocket: WebSocket,
                      player_id: UUID,
                      players_state: Optional[list] = None,
                      chats: Optional[list] = None,
                      game_state: Optional[dict] = None
                      ) -> None:
        """Accept a new WebSocket connection and send the initial state.

        Accepts the incoming WebSocket, registers it in
        :attr:`active_connections` under the given *player_id*, and sends back
        any provided initial state data.  At least one of *players_state*,
        *chats*, or *game_state* must be supplied.

        Args:
            websocket: The WebSocket connection to accept.
            player_id: The unique identifier of the connecting player.
            players_state: The current list of player states to send on
                connect.  Sent wrapped in an ``{'action': 'connect', ...}``
                message.
            chats: The chat history to send on connect.
            game_state: The current game state to send on connect.

        Raises:
            ValueError: If none of *players_state*, *chats*, or *game_state*
                is provided.
        """
        await websocket.accept()
        self.active_connections[player_id] = websocket
        if all(x is None for x in (players_state, chats, game_state)):
            raise ValueError("At least one of players_state, chats, or game_state must be provided")
        if players_state is not None:
            await self.broadcast(player_id, {'action': 'connect', 'players': players_state})
        if chats is not None:
            await self.broadcast(player_id, chats)
        if game_state is not None:
            await self.broadcast(player_id, game_state)

    def disconnect(self, player_id: UUID):
        """Remove a player's WebSocket connection from the active connections.

        Args:
            player_id: The unique identifier of the disconnecting player.
        """
        self.active_connections.pop(player_id, None)

    async def send_personal_message(self, player_id: UUID, message: dict | list):
        """Send a message to a specific player's WebSocket connection.

        Args:
            player_id: The unique identifier of the target player.
            message: The JSON-serializable message to send.

        Raises:
            ValueError: If no active connection exists for the given player ID.
        """
        connection = self.active_connections.get(player_id)
        if connection is None:
            raise ValueError(f"No active connection for player ID: {player_id}")

        await connection.send_json(message)

    async def broadcast(self, sender: UUID, message: dict | list):
        """Broadcast a message to all connected players except the sender.

        Args:
            sender: The unique identifier of the player sending the message.
            message: The JSON-serializable message to broadcast.
        """
        for id, connection in self.active_connections.items():
            if id != sender:
                await connection.send_json(message)
