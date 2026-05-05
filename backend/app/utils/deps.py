"""Dependency registry for Litestar DI.

Decorate provider functions with @dep("key") to register them.
In factory.py, call discover_and_import(["deps.py"]) then get_dependencies().

Example:
    @dep("my_service")
    def provide_my_service(transaction: AsyncSession) -> MyService:
        return MyService(transaction)
"""

import inspect
from collections.abc import Callable
from typing import Any

from litestar.di import Provide

_registry: dict[str, Provide] = {}


def dep(name: str, *, sync_to_thread: bool = False) -> Callable:
    """Register a provider function as a named Litestar dependency."""

    def decorator(fn: Callable) -> Callable:
        is_async = inspect.iscoroutinefunction(fn) or inspect.isasyncgenfunction(fn)
        _registry[name] = Provide(fn) if is_async else Provide(fn, sync_to_thread=sync_to_thread)
        return fn

    return decorator


def get_dependencies() -> dict[str, Any]:
    return dict(_registry)
