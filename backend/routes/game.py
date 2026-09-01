from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from uuid import UUID
from controllers.GameController import game_controller
from models.GameStateModel import GameStateModel
from models.UserPlayerModel import UserPlayerModel

from services.GameAction import GameAction
from services.Influence import Influence

router = APIRouter()


@router.get("/game-state", response_model=GameStateModel)
def get_game_state():
    try:
        return game_controller.get_game_states()
    except AttributeError:
        raise HTTPException(status_code=404, detail="Game not found")


@router.get('/user-player', response_model=UserPlayerModel)
def get_user_player(user_id: UUID):
    try:
        player = game_controller.get_player_by_id(user_id)
    except AttributeError:
        raise HTTPException(status_code=404, detail="Player not found")

    return UserPlayerModel(
        name=player.name,
        id=player.id,
        coins=player.coins,
        cards=[card.name for card in player.cards],
    )


@router.websocket("/ws/game")
async def game_websocket(websocket: WebSocket, user_id: UUID):
    try:
        player = game_controller.get_player_by_id(user_id)
    except AttributeError:
        await websocket.close(code=1008, reason="Game not found")
        return
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
                payload_move: str = payload.get("move")
                target: str = payload.get("target")
                try:
                    move = GameAction(payload_move.upper())
                    game_controller.declare_move(
                            player_id=user_id,
                            move=move,
                            target_id=UUID(target) if target else None,
                            blocker_id=UUID(payload.get("blockerId")) if payload.get("blockerId") else None
                    )
                except (ValueError, Exception) as e:
                    await websocket.send_json({"error": str(e)})

            elif action == "block":
                # TODO: implement block resolution
                await websocket.send_json({"error": "Block not yet implemented"})

            elif action == "exchange_selection":
                try:
                    chosen_card_names = payload.get("cards", [])
                    chosen_cards = [Influence[name] for name in chosen_card_names]
                    game_controller.game.resolve_exchange(user_id, chosen_cards)
                except (ValueError, Exception) as e:
                    await websocket.send_json({"error": str(e)})

            elif action == "influence_selection":
                try:
                    card_name = payload.get("card")
                    card_to_remove = Influence[card_name]
                    game_controller.game.resolve_influence_selection(user_id, card_to_remove)
                except (ValueError, Exception) as e:
                    await websocket.send_json({"error": str(e)})

            elif action == "challenge":
                try:
                    challenger_id = UUID(payload.get("challengerId")) if payload.get("challengerId") else user_id
                    loser_id = game_controller.game.get_challenge_loser(challenger_id)
                    await websocket.send_json({
                        "action": "challenge_result",
                        "loser_id": str(loser_id) if loser_id else None,
                    })
                except (ValueError, Exception) as e:
                    await websocket.send_json({"error": str(e)})

            elif action == "no_challenge":
                try:
                    game_controller.game.handle_no_challenge()
                except (ValueError, Exception) as e:
                    await websocket.send_json({"error": str(e)})

            else:
                await websocket.send_json({"error": f"Unknown action: {action}"})

    except WebSocketDisconnect:
        game_controller.game_manager.disconnect(user_id)

    except Exception as e:
        import traceback
        traceback.print_exc()
        game_controller.game_manager.disconnect(user_id)
