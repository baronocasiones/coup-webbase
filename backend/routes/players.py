from fastapi import APIRouter, HTTPException
from services.Player import Player
from models.PlayerModel import PlayerModel
from uuid import UUID
from utils.state import game

router = APIRouter()


@router.get("/players", response_model=list[PlayerModel])
def get_players():
    return game.players

@router.get("/player", response_model=PlayerModel)
def get_player(user_id: UUID):
    player = game.get_player(user_id)
    if player:
        return player
    return HTTPException(status_code=404, detail="Player not found")

@router.post("/player", response_model=PlayerModel)
def add_player(player_name: str):
    player = Player(player_name)
    game.add_player(player)
    return player
    
@router.delete("/player", response_model=list[PlayerModel])
def remove_player(user_id: UUID):
    game.update_players_state([player for player in game.players if player.id != user_id])
    return game.players

@router.patch("/player", response_model=list[PlayerModel])
def update_players_state(target_player_id: UUID, new_ready_state: bool):
    for player in game.players:
        if player.id == target_player_id:
            player.toggle_ready()
            if player.isReady != new_ready_state:
                raise HTTPException(status_code=400, detail="Synchronization error")

            game.update_players_state(update_player=player)
    return game.players
