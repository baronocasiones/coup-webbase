from uuid import UUID, uuid4
<<<<<<< HEAD
from services.Player import Player
from services.GameState import GameState
from utils.exceptions import SynchronizationError
=======
from services.Players import Players
from services.GameState import GameState
from typing import Optional, List
from datetime import datetime
>>>>>>> backend-branch-kayl

class CoupGame:
    def __init__(self):
        self.declared_move: str = ""
<<<<<<< HEAD
        self.players: list[Player] = []
=======
        self.players: list[Players] = []
>>>>>>> backend-branch-kayl
        self.game_id: UUID = uuid4()
        self.move_logs: list[Logs] = []
        self.turn: int = 0
        self.state: GameState = GameState.WAITING_FOR_PLAYERS
<<<<<<< HEAD
        self.chats: list[dict] = []

    def add_chat(self, chat_message: dict) -> None:
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
        if update_player:
            for idx, player in enumerate(self.players):
                if player.id == update_player.id:
                    self.players[idx] = update_player
                    break
        else:
            self.players = updated_players_state

    def add_player(self, new_player: Player) -> None:
        self.players.append(new_player)

    def get_player(self, player_id: UUID) -> Player | None:
        for player in self.players:
            if player.id == player_id:
                return player
        raise ValueError("Player not found")

    def start_game(self) -> None:
        pass

    def handle_move(self, player_id: UUID, move: str) -> None:
        pass

    def handle_challenge(self) -> None:
        pass

    def resolve_no_challenge(self) -> None:
        pass

=======

        # Game configuration constants


        # Current turn state
        self.turn: int = 0
        self.current_player_index: int = 0
        self.declared_move: Optional[PlayerAction] = None
        self.declared_player_id: Optional[UUID] = None
        self.move_target_id: Optional[UUID] = None
        
        # Challenge state
        self.challenger_id: Optional[UUID] = None
        self.players_who_can_challenge: List[UUID] = []
        self.players_blocking: List[UUID] = []  # For block actions


    # PLAYER MANAGEMENT CODES !!!!!!! #

    # create account for players joining games/lobbies/sessions
    def add_player(self, new_player: Players) -> Optional[Players]:
        """
        Add a player to the game.
        
        Args:
            name: Player name
            
        Returns:
            Player object if successful, None if game full or started
        """
        if self.game_state != GameState.WAITING_FOR_PLAYERS:
            return None
        
        if len(self.players) >= self.MAX_PLAYERS:
            return None
        
        player = Player(
            player_id=uuid4(),
            name=name,
            coins=self.STARTING_COINS,
            cards=self._generate_starting_cards()
        )
        self.players.append(player)
        return player

    # generate starting cards for players
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
        pass

    # process player moves, challenges, and game state transitions | Decleration only (not execution of the move)
    def handle_move(self, player_id: UUID, move: str) -> None:
        pass

    # process challenges to declared moves
    def handle_challenge(self) -> None:
        pass

    # process when no challenges are made to declared moves
    def resolve_no_challenge(self) -> None:
        pass

    # execute the declared move after challenges are resolved
>>>>>>> backend-branch-kayl
    def execute_move(self) -> None:
        pass
