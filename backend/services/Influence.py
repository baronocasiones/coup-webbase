from enum import Enum
from .GameAction import GameAction
from .BlockMove import BlockMove


class Influence(Enum):
    """
    InfluenceAction Enum maps character roles to their game actions.
    """
    DUKE = [GameAction.TAX, BlockMove.BLOCK_FOREIGN_AID]
    ASSASSIN = [GameAction.ASSASSINATE]
    CAPTAIN = [GameAction.STEAL, BlockMove.BLOCK_STEAL]
    AMBASSADOR = [GameAction.EXCHANGE, BlockMove.BLOCK_STEAL]
    CONTESSA = [GameAction.BLOCK_ASSASSINATION]

    def get_actions(self) -> list:
        return self.value

