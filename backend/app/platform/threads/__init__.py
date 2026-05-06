"""Threads module for real-time messaging on threadable objects."""

from app.platform.threads.routes import thread_router
from app.platform.threads.websocket import thread_handler

__all__ = ["thread_router", "thread_handler"]
