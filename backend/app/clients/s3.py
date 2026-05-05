"""S3 client abstraction.

LocalS3Client  — stores files under /tmp/local-s3/ for dev/test.
S3Client       — aioboto3-backed real AWS S3 client.
"""

from abc import ABC, abstractmethod
from pathlib import Path


class BaseS3Client(ABC):
    @abstractmethod
    async def get_bytes(self, bucket: str, key: str) -> bytes: ...

    @abstractmethod
    async def put_bytes(
        self, bucket: str, key: str, data: bytes, content_type: str = "application/octet-stream"
    ) -> None: ...


class LocalS3Client(BaseS3Client):
    """Stores objects as files under /tmp/local-s3/{bucket}/{key}."""

    _root = Path("/tmp/local-s3")

    def _path(self, bucket: str, key: str) -> Path:
        return self._root / bucket / key

    async def get_bytes(self, bucket: str, key: str) -> bytes:
        p = self._path(bucket, key)
        if not p.exists():
            raise FileNotFoundError(f"LocalS3: s3://{bucket}/{key} not found")
        return p.read_bytes()

    async def put_bytes(
        self, bucket: str, key: str, data: bytes, content_type: str = "application/octet-stream"
    ) -> None:
        p = self._path(bucket, key)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(data)


class S3Client(BaseS3Client):
    """AWS S3 client backed by aioboto3."""

    def __init__(self, region: str) -> None:
        self._region = region

    async def get_bytes(self, bucket: str, key: str) -> bytes:
        import aioboto3  # noqa: PLC0415

        session = aioboto3.Session()
        async with session.client("s3", region_name=self._region) as client:  # type: ignore[reportGeneralTypeIssues]
            response = await client.get_object(Bucket=bucket, Key=key)
            async with response["Body"] as stream:
                return await stream.read()

    async def put_bytes(
        self, bucket: str, key: str, data: bytes, content_type: str = "application/octet-stream"
    ) -> None:
        import aioboto3  # noqa: PLC0415

        session = aioboto3.Session()
        async with session.client("s3", region_name=self._region) as client:  # type: ignore[reportGeneralTypeIssues]
            await client.put_object(Bucket=bucket, Key=key, Body=data, ContentType=content_type)
