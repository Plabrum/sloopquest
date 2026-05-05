import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv(".env.local")
load_dotenv("../.env.local")


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

    # ─── Email templates ──────────────────────────────────────────────────────
    EMAIL_TEMPLATES_DIR: str = "templates/emails-react"

    # ─── LLM ──────────────────────────────────────────────────────────────────
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")

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


def get_config() -> Config:
    return Config()


config = get_config()
