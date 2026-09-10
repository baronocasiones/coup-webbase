from abc import ABC, abstractmethod
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from services.CoupGame import CoupGame


class BaseActionStrategy(ABC):
    @abstractmethod
    def execute(self, game: 'CoupGame', **kwargs):
        pass
