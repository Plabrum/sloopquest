"""DI providers for media routes."""

from app.config import config
from app.platform.clients.s3 import BaseS3Client, LocalS3Client, S3Client
from app.utils.deps import dep


@dep("s3_client")
def provide_s3_client() -> BaseS3Client:
    """Resolve the S3 client for request handlers (LocalS3Client in dev)."""
    if config.IS_DEV:
        return LocalS3Client()
    return S3Client(config.AWS_REGION)
