from services.GameState import GameState
from services.GameAction import GameAction
from services.BlockMove import BlockMove

from pydantic import BaseModel
from models.PlayerModel import PlayerModel
from typing import Optional
from uuid import UUID


class GameStateModel(BaseModel):
    state: GameState
    cardsInDeck: int
    playersState: list[PlayerModel]
    declaredMove: Optional[GameAction]
    declaredBlock: Optional[BlockMove]
    challengeLoser: Optional[PlayerModel]
    latestMove: Optional[str] = None
    # Optional because a lobby with nobody in it has no current player, and
    # `get_game_states()` omits the key entirely in that case. It used to be
    # required, which meant the one call that renders an empty lobby raised
    # ValidationError — a 500 — the moment a finished game was reset and the
    # roster emptied. Returning to the lobby for a rematch goes straight
    # through that state, so the strictness was not hypothetical.
    currentTurn: Optional[PlayerModel] = None
    # Who declared the block, when `state` is BLOCK_DECLARED.
    #
    # This has to be public. During BLOCK_DECLARED, `currentTurn` is still the
    # player whose action was blocked — `currentTurnIndex` only moves in
    # next_turn() — so "is it my turn" cannot distinguish the actor (who
    # legally decides whether to challenge the block) from every other player.
    # Without this the client has no way to exclude the blocker, who must not
    # be able to resolve their own block. None outside BLOCK_DECLARED.
    blockerId: Optional[UUID] = None
    # Who must surrender an influence card, when `state` is
    # INFLUENCE_SELECTION_PENDING.
    #
    # Same problem as `blockerId`, one state further on. Coup and Assassinate
    # both hand the turn to the *target* without advancing `currentTurnIndex`, so
    # `currentTurn` still names the player who declared the action. "Is it my
    # turn" therefore points at the attacker, and the one player the server will
    # actually accept a surrender from gets nothing to click. Every action
    # handler swallows the resulting SynchronizationError into an `error` frame
    # the client only logs, so the game sits in this state until someone reloads.
    # None outside INFLUENCE_SELECTION_PENDING.
    pendingInfluenceTarget: Optional[UUID] = None
    # Who the declared action is aimed at, when it is aimed at anyone.
    #
    # Set only for a targetable action (Coup, Assassinate, Steal); next_turn()
    # clears it. A block is a response to being *hit*, so only the target may
    # block a Steal or an Assassination. The client cannot work that out for
    # itself — `move_target_id` was never on the wire — so it offered Block to
    # the whole table, and the server accepted it from anyone.
    #
    # None for an untargeted action, and that absence is meaningful rather than
    # merely missing: Foreign Aid is blockable but has no target, and any player
    # may block it. See the eligibility check in CoupGame.declare_move().
    moveTargetId: Optional[UUID] = None
    # How the game ended, winner first. None until a game is decided, and reset
    # to None when the table goes back to the lobby.
    #
    # Separate from `playersState`, which holds survivors only — `next_turn()`
    # deletes a player as soon as their last card goes — so once a game is over
    # the roster is a single player and the standings would be a single row.
    # This is where the eliminated players are still visible.
    finalStandings: Optional[list[PlayerModel]] = None

    class config:
        extra = 'ignore'
