from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from uuid import UUID
from controllers.GameController import game_controller
from controllers.LobbyController import lobby_controller
from models.GameStateModel import GameStateModel
from utils.state import game

from services.GameAction import GameAction

router = APIRouter()


@router.get("/game-state", response_model=GameStateModel)
def get_game_state():
    print("GAME STATE: ", game_controller.get_game_states())
    return game_controller.get_game_states()


@router.websocket("/ws/game")
async def game_websocket(websocket: WebSocket, user_id: UUID):
    player = game_controller.get_player_by_id(user_id)
    player_name = player.name if player else None
    if player_name is None:
        await websocket.close(code=1008, reason="Invalid player ID")
        return

    initial_state = GameStateModel(**game_controller.get_game_states()).model_dump(mode='json')
    await game_controller.game_manager.connect(websocket, user_id, game_state=initial_state)

    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")
            payload = data.get("payload", {})

            if action == "declare_move":
                move = payload.get("move")
                GameAction(move)  # Validate move
                # Handle declare move logic here

            elif action == "block":
                pass

            elif action == "exchange_selection":
                pass

            elif action == "challenge":
                pass

            else:
                print(f"Unknown action: {action}")

    except WebSocketDisconnect:
        game_controller.game_manager.disconnect(user_id)

    except Exception as e:
        print(f"WebSocket error: {e}")
