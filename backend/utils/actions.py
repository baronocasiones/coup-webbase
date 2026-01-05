from typing import Lists, Callable
from services.Player import Player
from services.Influence import Influence


def income(player: Player) -> None:
    player.coins += 1

def foreign_aid(player: Player) -> None:
    player.coins += 2

def coup(attacker: Player, target: Player) -> list[Influence]:
    if attacker.coins < 7:
        valueError("Player don't have enough coins to perform coup")
    if len(target.cards) == 0:
        valueError("Target don't have any cards")
    return target.cards

# DUKE - Tax
def tax(player: Player) -> None:
    player.coins += 3

# ASSASSIN - Assassinate
def assassinate(attacker: Player, target: Player) -> list[Influence]:
    if attacker.coins < 3:
        raise ValueError("Not enough coins to assassinate.")
    attacker.coins -= 3
    if not target.cards:
        raise ValueError("Target has no cards to lose.")
    return target.cards
    
# CAPTAIN - Steal
def steal(thief: Player, target: Player) -> None:
    if target.coins == 0:
        raise ValueError('There is nothing to steal from the traget')
    stolen = min(2, target.coins)
    target.coins -= stolen
    thief.coins += stolen

# AMBASSADOR — Exchange
def exchange(player: Player, new_card: Influence, index_to_replace: int) -> None: 
    player.remove_card(index_to_replace)
    player.add_card(new_card)





