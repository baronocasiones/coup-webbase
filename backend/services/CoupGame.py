from uuid import UUID, uuid4
from utils.exceptions import SynchronizationError
from services.Player import Player
from services.GameState import GameState
from typing import Optional, List
from datetime import datetime
from utils import globals
from services.GameAction import GameAction
from services.BlockMove import BlockMove
from services.Card import Card

class CoupGame:
    def __init__(self):
        self.available_cards: Card = Card()
        self.players: list[Player] = []
        self.game_id: UUID = uuid4()
        self.move_logs: list[Logs] = []
        self.state: GameState = GameState.WAITING_FOR_PLAYERS
        self.chats: list[dict] = []

        # Current turn state 
        self.current_player_index: int = 0
        self.declared_move: PlayerAction | None = None
        
        # self.players_who_can_challenge: List[UUID] = [] # not yet sure if needed
        # Challenge state
        self.challenge_loser: Player | None = None

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
        for player in self.players:
            player.add_card(self.available_cards.draw_card())
            player.add_card(self.available_cards.draw_card())

    # process player moves, challenges, and game state transitions | Decleration only (not execution of the move)
    def declare_move(self, player_id: UUID, move: GameAction | BlockMove) -> None:
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

        if isinstance(move, BlockMove) and current_player.id == player_id:
            raise SynchronizationError("Current player cannot block their own move.")

        if isinstance(move, GameAction):
            self.state = GameState.ACTION_DECLARED
        elif isinstance(move, BlockMove):
            self.state = GameState.ACTION_DECLARED
        else:
            raise ValueError("Invalid move type.")

        self.declared_move = move

    # process challenges to declared moves
    def handle_challenge(self, card_to_remove: int) -> None:
        """
        Handle the challenge resolution.
        Raises:
            SynchronizationError: If the game is not in a state to handle challenges.
        """
        if self.state != GameState.CHALLENGE_HANDLE:
            raise SynchronizationError("Game is not in a state to handle challenges.")

        if self.challenge_loser is None:
            raise ValueError("No challenge loser set.")

        # Remove the challenged card from the loser
        self.challenge_loser.remove_card(card_to_remove)

        # Reset challenge state
        self.next_turn()

    def get_challenge_loser(self, challenger_id: UUID) -> UUID:
        if not isinstance(challenger_id, UUID):
            raise ValueError('challenger_id should be a type UUID')
        if self.declared_move in [GameAction.INCOME, GameAction.COUP]:
            raise ValueError("Declared move cannot be challenged.")

        if self.state not in [GameState.ACTION_DECLARED, GameState.BLOCK_DECLARED]:
            raise SynchronizationError('Player cannot challenge in this time.')

        current_player: Player = self.players[self.current_player_index]
        challenger_player: Player = self.get_player(challenger_id)

        if challenger_player is None:
            raise ValueError("Challenger player not found.")

        if self.declared_move not in current_player.moves:
            current_player.is_lying = True

        self.state = GameState.CHALLENGE_HANDLE
        if current_player.is_lying:
            self.challenge_loser = current_player
            return current_player.id
        else:
            self.challenge_loser = challenger_player
            return challenger_id

    def handle_no_challenge(self) -> None:
        """
        Handle the scenario where no challenge is made against the declared move.
        """
        if self.state not in [GameState.ACTION_DECLARED, GameState.BLOCK_DECLARED]:
            raise SynchronizationError("Cannot proceeed without a declared move.")

        # Proceed to execute the declared move
        self.execute_move()
        self.next_turn()

    def next_turn(self) -> None:
        """
        Advance to the next player's turn and reset the game and players state.
        """
        self.current_player_index = (self.current_player_index + 1) % len(self.players)
        self.state = GameState.WAITING_FOR_ACTION
        self.declared_move = None
        self.challenge_loser = None
        for player in self.players:
            player.is_lying = False

    # execute the declared move after challenges are resolved
    def execute_move(self) -> None:
        pass
