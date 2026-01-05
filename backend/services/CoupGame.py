from uuid import UUID, uuid4
from utils.exceptions import SynchronizationError
from typing import Optional, List
from datetime import datetime
from utils import globals
from utils import actions
from utils.exceptions import PlayerInsufficientError

from .Player import Player
from .GameState import GameState
from .GameAction import GameAction
from .BlockMove import BlockMove
from .Card import Card

from models.MoveResult import MoveResult


class CoupGame:
    def __init__(self):
        self.court_deck: Card = Card()
        self.players: list[Player] = []
        self.game_id: UUID = uuid4()
        # self.move_logs: list[Logs] = []
        self.state: GameState = GameState.WAITING_FOR_PLAYERS
        self.chats: list[dict] = []
        self.move_target_id: UUID | None = None

        # Current turn state
        self.current_player_index: int = 0
        self.declared_move: GameAction | None = None

        # self.players_who_can_challenge: List[UUID] = [] # not yet sure if needed
        # Challenge state
        self.challenge_loser: Player | None = None

    def get_court_deck(self) -> Card:
        return self.court_deck

    def add_chat(self, chat_message: dict) -> None:
        """
        Add a chat message to the game's chat log.
        """
        chat_message_timestamp = chat_message.get("timestamp", None)
        if not self.chats:
            self.chats.append(chat_message)
            return

        last_timestamp = self.chats[-1].get('timestamp')
        if last_timestamp is not None and\
                chat_message_timestamp is not None and\
                last_timestamp <= chat_message_timestamp:
            self.chats.append(chat_message)
        else:
            raise SynchronizationError(
                f"""
                Chat message timestamp ({chat_message_timestamp}) is older than the
                latest message ({last_timestamp}).
                """
            )

    def remove_player(self, player_id: UUID) -> None:
        """
        Remove a player from the game by their ID.
        """
        self.players = [player for player in self.players if player.id != player_id]

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
        
        self.players.append(new_player)

    def get_player_by_id(self, player_id: UUID) -> Player | None:
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

        # Each player has 2 starting cards
        for player in self.players:
            player.add_card(self.court_deck.draw_card())
            player.add_card(self.court_deck.draw_card())

    # process player moves, challenges, and game state transitions | Decleration only (not execution of the move)
    def declare_move(self, player_id: UUID, move: GameAction | BlockMove, target_id: UUID = None) -> None:
        """
        Handle a player's declared move.
        Raises:
            SynchronizationError: If it's not the player's 
            turn and make a GameAction move or the game is not in a state
            to accept moves.
        """

        current_player = self.get_current_player()
        # ERROR GUARDS
        if isinstance(move, GameAction) and current_player.id != player_id:
            raise SynchronizationError("It's not this player's turn.")
        if isinstance(move, BlockMove) and current_player.id == player_id:
            raise SynchronizationError("Current player cannot block their own move.")
        if self.state != GameState.WAITING_FOR_ACTION:
            raise SynchronizationError("Game is not in a state to accept moves.")

        if isinstance(move, BlockMove) and not move.is_blockable():
            raise ValueError("This move cannot be blocked.")

        # LOGIC
        if isinstance(move, GameAction) and move.is_targetable():
            if target_id is None:
                raise ValueError("Target player ID must be provided for targetable moves.")
            self.move_target_id = target_id

        if isinstance(move, GameAction):
            self.state = GameState.ACTION_DECLARED
        elif isinstance(move, BlockMove):
            self.state = GameState.BLOCK_DECLARED
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
        if not self.declared_move.is_challengeable():
            raise ValueError("Declared move cannot be challenged.")

        if self.state not in [GameState.ACTION_DECLARED, GameState.BLOCK_DECLARED]:
            raise SynchronizationError('Player cannot challenge in this time.')

        current_player: Player = self.get_current_player()
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
        if any(len(player.cards) == 0 for player in self.players):
            raise SynchronizationError("Cannot proceed to next turn: a player has no cards left.")

        if len(self.players) == 1:
            self.state = GameState.GAME_OVER
            return

        self.current_player_index = (self.current_player_index + 1) % len(self.players)
        self.state = GameState.WAITING_FOR_ACTION
        self.declared_move = None
        self.challenge_loser = None
        self.move_target_id = None
        for player in self.players:
            player.is_lying = False

    def start_exchange(self):
        self.state = GameState.PENDING_EXCHANGE
        self.exchange_choices = [self.court_deck for _ in globals.EXCHANGE_DRAW] 
        return self.exchange_choices

    # execute the declared move after challenges are resolved
    def execute_move(self) -> MoveResult:
        current_player: Player = self.get_current_player()

        match self.declared_move:
            case GameAction.INCOME:
                actions.income(current_player)
                return MoveResult(choice_to_remove=None, exchange_choice=None)
            case GameAction.FOREIGN_AID:
                actions.foreign_aid(current_player)
                return MoveResult(choice_to_remove=None, exchange_choice=None)
            case GameAction.COUP:
                choice_to_remove = actions.coup(current_player, self.move_target_id)
                return MoveResult(choice_to_remove=choice_to_remove, exchange_choice=None)
            case GameAction.TAX:
                actions.tax(current_player)
                return MoveResult(choice_to_remove=None, exchange_choice=None)
            case GameAction.ASSASSINATE:
                choice_to_remove = actions.assassinate(current_player, self.move_target_id)
                return MoveResult(choice_to_remove=choice_to_remove, exchange_choice=None)
            case GameAction.STEAL:
                actions.steal(current_player, self.move_target_id)
                return MoveResult(choice_to_remove=None, exchange_choice=None)
            case GameAction.EXCHANGE:
                actions.exchange(current_player, )
                return MoveResult(choice_to_remove=None, exchange_choice=exchange_choice)
            case _:
                raise SynchronizationError("There is no declared move")

    def get_current_player(self) -> Player:
        return self.players[self.current_player_index]

    def get_target_player(self) -> Player | None:
        if self.move_target_id is None:
            return None
        return self.get_player_by_id(self.move_target_id)

#     def income(self) -> None:
#         current_player = self.get_current_player()
#         current_player.coins += 1
#
#     def foreign_aid(self) -> None:
#         current_player = self.get_current_player()
#         current_player.coins += 2
#
#     def coup(self) -> None:
#         current_player = self.get_current_player()
#         target_player = self.get_player(self.move_target_id)
#         if target_player.coins < 7:
#             valueError("Player don't have enough coins to perform coup")
#         if len(target_player.cards) == 0:
#             valueError("Target don't have any cards")
#         current_player.coins -= 7
#
#
# # DUKE - Tax
#     def tax(player: Player) -> None:
#         player.coins += 3
#
# # ASSASSIN - Assassinate
#     def assassinate(attacker: Player, target: Player) -> list[Influence]:
#         if attacker.coins < 3:
#             raise ValueError("Not enough coins to assassinate.")
#         attacker.coins -= 3
#         if not target.cards:
#             raise ValueError("Target has no cards to lose.")
#         return target.cards
#
# # CAPTAIN - Steal
#     def steal(thief: Player, target: Player) -> None:
#         if target.coins == 0:
#             raise ValueError('There is nothing to steal from the traget')
#         stolen = min(2, target.coins)
#         target.coins -= stolen
#         thief.coins += stolen
#
# # AMBASSADOR — Exchange
#     def exchange(player: Player, new_card: Influence, index_to_replace: int) -> None: 
#         player.remove_card(index_to_replace)
#         player.add_card(new_card)
#
#
#
