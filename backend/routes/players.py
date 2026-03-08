from fastapi import APIRouter, HTTPException
from services.Player import Player
from models.PlayerModel import PlayerModel
from uuid import UUID 
from utils.state import game
from controllers.LobbyController import lobby_controller

router = APIRouter()


@router.get("/players", response_model=list[PlayerModel])
def get_players():
    return lobby_controller.get_players()


@router.get("/player", response_model=PlayerModel)
def get_player(user_id: UUID):
    player = lobby_controller.get_player_by_id(user_id)
    if player:
        return player
    return HTTPException(status_code=404, detail="Player not found")


@router.post("/player", response_model=PlayerModel)
def add_player(player_name: str):
    player = Player(player_name)
    lobby_controller.add_player(player)
    return player


@router.delete("/player", response_model=list[PlayerModel])
def remove_player(user_id: UUID):
    lobby_controller.remove_player(user_id)
    return lobby_controller.get_players()


@router.patch("/player", response_model=list[PlayerModel])
def update_players_state(target_player_id: UUID):
    lobby_controller.update_players_state(target_player_id)
    return game.get_players()
