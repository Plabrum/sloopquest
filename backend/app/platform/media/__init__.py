"""Media module — image/video uploads with thumbnail post-processing."""

from app.platform.media.routes import local_files_router, media_router

__all__ = ["local_files_router", "media_router"]
