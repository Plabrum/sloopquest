import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv(".env.local")
load_dotenv("../.env.local")
load_dotenv(".env")
load_dotenv("../.env")


@dataclass
class Config:
    """Application configuration — reads from environment variables."""

    # ─── App ──────────────────────────────────────────────────────────────────
    ENV: str = os.getenv("ENV", "development")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO").upper()
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")

    # ─── CORS ─────────────────────────────────────────────────────────────────
    FRONTEND_ORIGIN: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
    API_BASE_URL: str = os.getenv("API_BASE_URL", "http://localhost:8000")

    # ─── Redis ────────────────────────────────────────────────────────────────
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")

    # ─── Queue ────────────────────────────────────────────────────────────────
    QUEUE_SYNC: bool = os.getenv("QUEUE_SYNC", "").lower() in {"1", "true", "yes"}

    # ─── AWS ──────────────────────────────────────────────────────────────────
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")

    # ─── Webhooks ─────────────────────────────────────────────────────────────
    WEBHOOK_SECRET: str = os.getenv("WEBHOOK_SECRET", "dev-webhook-secret")

    # ─── S3 ───────────────────────────────────────────────────────────────────
    S3_INBOUND_EMAIL_BUCKET: str = os.getenv("S3_INBOUND_EMAIL_BUCKET", "")
    S3_MEDIA_BUCKET: str = os.getenv("S3_MEDIA_BUCKET", "sloopquest-media")
    S3_DOCUMENTS_BUCKET: str = os.getenv("S3_DOCUMENTS_BUCKET", "sloopquest-documents")

    # ─── Upload limits ────────────────────────────────────────────────────────
    MAX_UPLOAD_SIZE: int = int(os.getenv("MAX_UPLOAD_SIZE", str(50 * 1024 * 1024)))  # 50 MB
    MAX_DOCUMENT_SIZE: int = int(os.getenv("MAX_DOCUMENT_SIZE", str(100 * 1024 * 1024)))  # 100 MB

    # ─── Email templates ──────────────────────────────────────────────────────
    EMAIL_TEMPLATES_DIR: str = "email_templates/out/emails-react"

    # ─── PDF templates ────────────────────────────────────────────────────────
    PDF_TEMPLATES_DIR: str = "pdf_templates/out/pdfs"

    # ─── Domain ───────────────────────────────────────────────────────────────
    # Terraform owns the domain (var.domain); the app owns local-parts and display names.
    DOMAIN: str = os.getenv("DOMAIN", "sloopquest.local")

    # ─── SES ──────────────────────────────────────────────────────────────────
    SES_REGION: str = os.getenv("SES_REGION", os.getenv("AWS_REGION", "us-east-1"))
    SES_CONFIGURATION_SET: str = os.getenv("SES_CONFIGURATION_SET", "")
    SES_FROM_NAME: str = "Sloopquest"

    @property
    def SES_FROM_EMAIL(self) -> str:  # noqa: N802
        return f"noreply@{self.DOMAIN}"

    @property
    def SES_REPLY_TO_EMAIL(self) -> str:  # noqa: N802
        return f"support@{self.DOMAIN}"

    @property
    def INBOX_DOMAIN(self) -> str:  # noqa: N802
        return self.DOMAIN

    # ─── Stripe ───────────────────────────────────────────────────────────────
    STRIPE_SECRET_KEY: str = os.getenv("STRIPE_SECRET_KEY", "")
    STRIPE_WEBHOOK_SECRET: str = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    STRIPE_CONNECT_WEBHOOK_SECRET: str = os.getenv("STRIPE_CONNECT_WEBHOOK_SECRET", "")

    # ─── LLM ──────────────────────────────────────────────────────────────────
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    USE_REAL_LLM: bool = os.getenv("USE_REAL_LLM", "").lower() in {"1", "true", "yes"}
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_REALTIME_MODEL: str = os.getenv("OPENAI_REALTIME_MODEL", "gpt-realtime-2025-08-28")

    @property
    def IS_DEV(self) -> bool:
        return self.ENV == "development"

    def _build_db_url(
        self,
        driver: str = "",
        user: str | None = None,
        password: str | None = None,
        port: str | None = None,
    ) -> str:
        endpoint = os.getenv("DB_ENDPOINT", "localhost")
        port = port or os.getenv("DB_PORT", "5432")
        name = os.getenv("DB_NAME", "sloopquest")
        user = user or os.getenv("DB_USER", "postgres")
        password = password or os.getenv("DB_PASSWORD", "postgres")
        return f"postgresql{driver}://{user}:{password}@{endpoint}:{port}/{name}"

    @property
    def ASYNC_DATABASE_URL(self) -> str:
        if url := os.getenv("ASYNC_DATABASE_URL"):
            return url
        return self._build_db_url(driver="+psycopg")

    @property
    def ADMIN_DB_URL(self) -> str:
        if url := os.getenv("ADMIN_DB_URL"):
            return url
        return self._build_db_url()


@dataclass
class TestConfig(Config):
    """Test environment — points at the test database on port 5435."""

    __test__ = False  # Prevent pytest from collecting this as a test class

    ENV: str = "testing"

    @property
    def ASYNC_DATABASE_URL(self) -> str:
        if url := os.getenv("TEST_ASYNC_DATABASE_URL") or os.getenv("ASYNC_DATABASE_URL"):
            return url
        return self._build_db_url(driver="+psycopg", port="5435")

    @property
    def ADMIN_DB_URL(self) -> str:
        if url := os.getenv("TEST_ADMIN_DB_URL") or os.getenv("ADMIN_DB_URL"):
            return url
        return self._build_db_url(port="5435")


def get_config() -> Config:
    env = os.getenv("ENV", "development")
    if env == "testing":
        return TestConfig()
    return Config()


config = get_config()
