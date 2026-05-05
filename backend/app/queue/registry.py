import inspect
from collections.abc import Callable
from dataclasses import dataclass, field
from functools import wraps
from typing import Any

from saq import CronJob
from saq.types import Function

from app.queue.enums import TaskName


@dataclass
class TaskRegistry:
    _tasks: list[Function] = field(default_factory=list)
    _scheduled_tasks: list[CronJob] = field(default_factory=list)

    def get_all_tasks(self) -> list[Function]:
        return list(self._tasks)

    def get_all_scheduled_tasks(self) -> list[CronJob]:
        return list(self._scheduled_tasks)

    def get_task_by_name(self, name: TaskName) -> Callable[..., Any] | None:
        return next((t for t in self._tasks if t.__name__ == str(name)), None)


_registry = TaskRegistry()


def get_registry() -> TaskRegistry:
    return _registry


def task(name: TaskName) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
    def decorator(fn: Callable[..., Any]) -> Callable[..., Any]:
        # Unwrap decorator stack (@with_transaction etc.) to inspect the real signature.
        original = inspect.unwrap(fn)
        injectable = set(inspect.signature(original).parameters)

        @wraps(fn)
        async def wrapper(ctx: Any, **kwargs: Any) -> Any:
            for key in injectable:
                if key not in kwargs and key in ctx:
                    kwargs[key] = ctx[key]
            return await fn(ctx, **kwargs)

        wrapper.__name__ = str(name)  # SAQ looks up tasks by __qualname__
        wrapper.__qualname__ = str(name)
        _registry._tasks.append(wrapper)
        return wrapper

    return decorator


def scheduled_task(cron: str) -> Callable[[Callable[..., Any]], Callable[..., Any]]:

    def decorator(fn: Callable[..., Any]) -> Callable[..., Any]:
        _registry._scheduled_tasks.append(CronJob(function=fn, cron=cron))
        return fn

    return decorator
