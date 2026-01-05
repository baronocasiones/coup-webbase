from abc import ABC, abstractmethod
from services.CoupGame import CoupGame


class BaseActionStrategy(ABC):
    @abstractmethod
    def execute(self, game: CoupGame, **kwargs):
        pass
