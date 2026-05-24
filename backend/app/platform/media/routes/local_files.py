"""Dev-only local upload/download endpoints used by LocalS3Client."""

from pathlib import Path

from litestar import Request, Response, Router, get, put

from app.platform.auth.guards import requires_local
from app.platform.clients.s3 import BaseS3Client


@put("/local-upload/{bucket:str}/{key:path}", guards=[requires_local])
async def local_upload(
    bucket: str,
    key: str,
    request: Request,
    s3_client: BaseS3Client,
) -> Response:
    """Receive a raw PUT body and write it to LocalS3Client storage."""
    data = await request.body()
    await s3_client.put_bytes(bucket, key.lstrip("/"), data)
    return Response(content={"status": "uploaded"}, status_code=201)


@get("/local-download/{bucket:str}/{key:path}", guards=[requires_local])
async def local_download(bucket: str, key: str, s3_client: BaseS3Client) -> Response:
    """Serve a file from LocalS3Client storage."""
    key = key.lstrip("/")
    if not await s3_client.file_exists(bucket, key):
        raise FileNotFoundError(f"File not found: {bucket}/{key}")

    content = await s3_client.get_bytes(bucket, key)
    suffix = Path(key).suffix.lower()
    content_type_map = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".mp4": "video/mp4",
        ".mov": "video/quicktime",
        ".avi": "video/x-msvideo",
        ".webm": "video/webm",
        ".pdf": "application/pdf",
    }
    content_type = content_type_map.get(suffix, "application/octet-stream")

    return Response(
        content=content,
        media_type=content_type,
        headers={"Cache-Control": "public, max-age=31536000"},
    )


local_files_router = Router(
    path="",
    guards=[],
    route_handlers=[local_upload, local_download],
    tags=["media-local"],
)
