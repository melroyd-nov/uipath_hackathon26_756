"""Provider-swappable LLM layer.

`get_llm()` returns a LangChain chat model (Ollama locally, or hosted Anthropic) based on
settings. `structured(Schema)` wraps it with Pydantic structured output, replacing the
notebook's hand-rolled `format:"json"` + manual parsing.
"""
from __future__ import annotations

from functools import lru_cache
from typing import Type, TypeVar

from langchain_core.language_models import BaseChatModel
from pydantic import BaseModel

from .settings import get_settings

T = TypeVar("T", bound=BaseModel)


@lru_cache(maxsize=8)
def get_llm(judge: bool = False, temperature: float = 0.0) -> BaseChatModel:
    """Return the configured chat model. `judge=True` uses the (optionally stronger) judge model."""
    s = get_settings()
    if s.llm_provider == "ollama":
        from langchain_ollama import ChatOllama
        model = s.judge_model_name if judge else s.ollama_model
        return ChatOllama(
            model=model,
            base_url=s.ollama_base_url,
            temperature=temperature,
            num_ctx=8192,
        )
    if s.llm_provider == "anthropic":
        from langchain_anthropic import ChatAnthropic
        model = s.judge_model_name if judge else s.anthropic_model
        return ChatAnthropic(
            model=model,
            temperature=temperature,
            api_key=s.anthropic_api_key,
        )
    raise ValueError(f"Unknown llm_provider: {s.llm_provider!r} (use 'ollama' or 'anthropic')")


def structured(schema: Type[T], *, judge: bool = False, temperature: float = 0.0):
    """A runnable that returns an instance of `schema` (Pydantic) from a prompt."""
    return get_llm(judge=judge, temperature=temperature).with_structured_output(schema)
