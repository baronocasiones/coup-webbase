class PlayerInsufficientError(Exception):
    """
    Raised when a CoupGame instance doesn't have 
    enough players to start the game or call the
    start_game method.
    """
    pass 

class SynchronizationError(Exception):
    """
    Raised when there is a mismatch between the expected
    and actual state of a player during state updates.
    """
    pass

class PlayerNotFoundError(Exception):
    """
    Raise when player is not found in the game.
    """
