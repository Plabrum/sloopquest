"""LLM client dependency — module-level singleton, one client per process."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import config as app_config
from app.platform.llm.client import (
    AnthropicLLMClient,
    BaseLLMClient,
    LocalLLMClient,
    OpenAIRealtimeLLMClient,
)
from app.platform.llm.service import LLMService
from app.utils.deps import dep

_use_anthropic = (not app_config.IS_DEV) or (app_config.USE_REAL_LLM and bool(app_config.ANTHROPIC_API_KEY))
_llm_client: BaseLLMClient = AnthropicLLMClient() if _use_anthropic else LocalLLMClient()

_voice_client: BaseLLMClient = OpenAIRealtimeLLMClient()


@dep("llm_client")
def provide_llm_client() -> BaseLLMClient:
    return _llm_client


@dep("voice_llm_client")
def provide_voice_llm_client() -> BaseLLMClient:
    return _voice_client


@dep("llm_service")
def provide_llm_service(transaction: AsyncSession, llm_client: BaseLLMClient) -> LLMService:
    return LLMService(transaction, llm_client)
