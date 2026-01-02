from typing import Lists, Callable
from models.players import Players

# DUKE - Tax
def tax(player: Players) -> None:
    player.coins += 3

# ASSASSIN - Assassinate
def assassinate(attacker: Players, target: Players) -> str | None:
    if attacker.coins < 3:
        raise ValueError("Not enough coins to assassinate.")
    attacker.coins -= 3
    if not target.cards:
        return None
    return target.cards.pop()
    
# CAPTAIN - Steal
def steal(thief: Players, target: Players) -> int:
    stolen = min(2, target.coins)
    target.coins -= stolen
    thief.coins += stolen
    return stolen

# AMBASSADOR — Exchange
'''def exchange(
    player: Players,
    court_deck: List[str],
    choose_fn: Callable[[List[str]], List[str]],) -> None: #chooses which cards to keep
    if len(court_deck) < 2:
        raise ValueError("Not enough cards in the Court deck.")

    drawn = [court_deck.pop(), court_deck.pop()]
    options = player.cards + drawn

    chosen = choose_fn(options)

    if len(chosen) != len(player.cards):
        raise ValueError("Must keep the same number of cards.")

    player.cards = chosen

    returned = [card for card in options if card not in chosen]
    court_deck.extend(returned)'''