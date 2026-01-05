from typing import Callable
from fastapi import WebSocket
from services.CoupGame import CoupGame


def prompt_user_input(func: Callable, user_input: ) -> Callable:
    async def wrapper(game: CoupGame, *args, **kwargs):
        # TODO: continue here nigga
        return await func(user_input, *args, **kwargs)
    return wrapper
