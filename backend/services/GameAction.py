from enum import Enum

class GameAction(Enum):
    INCOME = 'INCOME'
    FOREIGN_AID = 'FOREIGN AID'
    COUP = 'COUP'
    TAX = 'TAX'
    ASSASSINATE = 'ASSASSINATE'
    STEAL = 'STEAL'
    EXCHANGE = 'EXCHANGE'
    BLOCK_FOREIGN_AID = 'BLOCK FOREIGN AID'
    BLOCK_ASSASSINATION = 'BLOCK ASSASSINATION'
    BLOCK_STEALING = 'BLOCK STEALING'

    def is_targetable(self) -> bool:
        return self in [
                    GameAction.COUP,
                    GameAction.ASSASSINATE,
                    GameAction.STEAL,
                ]

    def is_blockable(self) -> bool:
        return self in [
                    GameAction.STEAL,
                    GameAction.ASSASSINATE,
                    GameAction.FOREIGN_AID,
                ]

    def is_challengeable(self) -> bool:
        return self not in [
                    GameAction.INCOME,
                    GameAction.COUP,
                    GameAction.FOREIGN_AID
                ]
