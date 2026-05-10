"""LLM client dependency — module-level singleton, one client per process."""

from app.config import config as app_config
from app.platform.llm.client import AnthropicLLMClient, BaseLLMClient, LocalLLMClient
from app.utils.deps import dep

_llm_client: BaseLLMClient = LocalLLMClient() if app_config.IS_DEV else AnthropicLLMClient()


@dep("llm_client")
def provide_llm_client() -> BaseLLMClient:
    return _llm_client
