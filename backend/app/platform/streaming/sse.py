"""Generic SSE byte formatting — no LLM imports."""

import json
from collections.abc import AsyncGenerator
from datetime import datetime

from litestar.response import Stream

from app.utils.sqids import Sqid


def _json_default(obj: object) -> object:
    if isinstance(obj, Sqid):
        return str(obj)
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Not JSON serializable: {type(obj)!r}")


def format_frame(event: str, data: dict) -> bytes:
    encoded = json.dumps(data, default=_json_default)
    return f"event: {event}\r\ndata: {encoded}\r\n\r\n".encode()


def stream_response(gen: AsyncGenerator[bytes]) -> Stream:
    return Stream(
        content=gen,
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
