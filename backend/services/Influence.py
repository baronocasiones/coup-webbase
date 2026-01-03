from enum import Enum
from .GameAction import GameAction
from .BlockMove import BlockMoves


class Influence(Enum):
    """
    InfluenceAction Enum maps character roles to their game actions.
    """
    DUKE = [GameAction.TAX, BlockMoves.BLOCK_FOREIGN_AID]
    ASSASSIN = [GameAction.ASSASSINATE]
    CAPTAIN = [GameAction.STEAL, BlockMoves.BLOCK_STEALING]
    AMBASSADOR = [GameAction.EXCHANGE, BlockMoves.BLOCK_STEALING]
    CONTESSA = [GameAction.BLOCK_ASSASSINATION]


