from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from uuid import UUID
from controllers.GameController import game_controller
from models.GameStateModel import GameStateModel


router = APIRouter()
game_manager = game_controller.game_manager


@router.websocket("/ws/game")
async def game_websocket(websocket: WebSocket, user_id: UUID):
    player = game_controller.get_player_by_id(user_id)
    player_name = player.name if player else None
    if player_name is None:
        await websocket.close(code=1008, reason="Invalid player ID")
        return

    initial_state = GameStateModel(game_controller.game).model_dump(mode='json')
    await game_manager.connect(websocket, user_id, initial_state)

    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")
            payload = data.get("payload", {})

            if action == "declare_move":
                pass

            elif action == "block":
                pass

            elif action == "exchange_selection":
                pass

            elif action == "challenge":
                pass

            else:
                print(f"Unknown action: {action}")

    except WebSocketDisconnect:
        game_manager.disconnect(user_id)

    except Exception as e:
        print(f"WebSocket error: {e}")
