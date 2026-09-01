import pytest


def pytest_configure(config):
    config.addinivalue_line("markers", "unit: Pure unit tests (single module, no HTTP)")
    config.addinivalue_line(
        "markers",
        "integration: Integration tests (multi-module, HTTP, or global state)",
    )
