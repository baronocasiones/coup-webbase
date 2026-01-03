from uuid import UUID, uuid4
from utils.exceptions import SynchronizationError
from services.Player import Player
from services.GameState import GameState
from typing import Optional, List
from datetime import datetime
from utils import globals
from services.GameAction import GameAction
from services.BlockMoves import BlockMoves

class CoupGame:
    def __init__(self):
        self.players: list[Player] = []
        self.game_id: UUID = uuid4()
        self.move_logs: list[Logs] = []
        self.state: GameState = GameState.WAITING_FOR_PLAYERS
        self.chats: list[dict] = []

        # Current turn state
        self.current_player_index: int = 0
        self.declared_move: Optional[PlayerAction] = None
        
        # Challenge state
        self.challenger_id: Optional[UUID] = None
        # self.players_who_can_challenge: List[UUID] = [] # not yet sure if needed
        self.players_blocking: UUID = []  # For block actions

    def add_chat(self, chat_message: dict) -> None:
        """
        Add a chat message to the game's chat log.
        """
        chat_message_timestamp = chat_message.get("timestamp", None)
        if not self.chats:
            self.chats.append(chat_message)
            return

        last_timestamp = self.chats[-1].get('timestamp')
        if last_timestamp is not None and chat_message_timestamp is not None and last_timestamp <= chat_message_timestamp:
            self.chats.append(chat_message)
        else:
            raise SynchronizationError(
                f"Chat message timestamp ({chat_message_timestamp}) is older than the latest message ({last_timestamp})."
            )

    def update_players_state(self, updated_players_state: list[Player] = None, update_player: Player = None) -> None:
        """
        Update the state of players in the game.
        If given a list of player states, it replaces the entire players list.
        If given a single player, it updates that player's state in the existing list.
        """
        if update_player:
            for idx, player in enumerate(self.players):
                if player.id == update_player.id:
                    self.players[idx] = update_player
                    break
        else:
            self.players = updated_players_state

    def add_player(self, new_player: Player) -> None:
        """
        Add a player to the game.
            
        Returns:
            Player object if successful, None if game full or started
        """
        # TODO: need to raise exception instead of returning None
        if self.game_state != GameState.WAITING_FOR_PLAYERS:
            return None
        
        if len(self.players) >= self.MAX_PLAYERS:
            return None
        
        self.players.append(player)

    def get_player(self, player_id: UUID) -> Player | None:
        """Retrieve a player by their ID."""
        for player in self.players:
            if player.id == player_id:
                return player
        raise ValueError("Player not found")

    # generate starting cards for players
    # TODO: need better logic
    def generate_starting_cards(self) -> List[Card]:
         """Generate starting cards for a player"""
        return [
            Card(character=Character.CONTESSA),
            Card(character=Character.DUKE)
            Card(character=Character.ASSASSIN),
            Card(character=Character.CAPTAIN),
            Card(character=Character.AMBASSADOR)
        ]
        
    # start the game when there are 2 or more players in the lobby/room (min 2, max 6)
    def start_game(self) -> None:
        """
        Start the game if enough players are present.
        Raises:
            PlayerInsufficientError: If there are not enough players to start the game.
        state transitions to WAITING_FOR_ACTION
        """
        if len(self.players) < globals.MIN_PLAYERS:
            raise PlayerInsufficientError(
                f"Not enough players to start the game. Minimum {globals.MIN_PLAYERS} players required."
            )
        self.state = GameState.WAITING_FOR_ACTION

    # process player moves, challenges, and game state transitions | Decleration only (not execution of the move)
    def declare_move(self, player_id: UUID, move: GameAction | BlockMoves) -> None:
        """
        Handle a player's declared move.
        Raises:
            SynchronizationError: If it's not the player's 
            turn and make a GameAction move or the game is not in a state
            to accept moves.
        """
        if self.state != GameState.WAITING_FOR_ACTION:
            raise SynchronizationError("Game is not in a state to accept moves.")
        current_player = self.players[self.current_player_index]

        if isinstance(move, GameAction) and current_player.id != player_id:
            raise SynchronizationError("It's not this player's turn.")

        if isinstance(move, BlockMoves) and current_player.id == player_id:
            raise SynchronizationError("Current player cannot block their own move.")

        if isinstance(move, GameAction):
            self.state = GameState.ACTION_DECLARED
        elif isinstance(move, BlockMoves):
            self.state = GameState.ACTION_DECLARED
        else:
            raise ValueError("Invalid move type.")

        self.declared_move = move

    # process challenges to declared moves
    def handle_challenge(self):
        pass

    def get_challenge_loser(self, challenger_id: UUID) -> UUID:
        if not isinstance(challenger_id, UUID):
            raise ValueError('challenger_id should be a type UUID')
        if not self.state == GameState.ACTION_DECLARED or not self.state == GameState.BLOCK_DECLARED:
            raise SynchronizationError('Player cannot challenge in this time.')

        current_player: Player = self.players[self.current_player_index]
        self.state = GameState.CHALLENGE_HANDLE
        if current_player.is_lying:
            return current_player.id
        else:
            return challenger_id

    # execute the declared move after challenges are resolved
    def execute_move(self) -> None:
        pass
