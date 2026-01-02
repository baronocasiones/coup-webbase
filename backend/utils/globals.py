from GameAction import GameAction
 
MIN_PLAYERS = 2
MAX_PLAYERS = 6
STARTING_COINS = 2
STARTING_CARDS = 2
COUP_COST = 7
ASSASSINATION_COST = 3
COUP_THRESHOLD = 10  # Forced to coup at this coin amount
TREASUREY_COINS = 50

DUKE_ACTIONS = {"duke": [GameAction.TAX]}
ASSASSIN_ACTIONS = {"assassin": [GameAction.ASSASSINATE]}
CAPTAIN_ACTIONS = {"captain": [GameAction.STEAL]}
AMBASSADOR_ACTIONS = {"ambassador": [GameAction.EXCHANGE]}
CONTESSA_ACTIONS = {"contessa": [GameAction.BLOCK_ASSASSINATION]}

