"""Central configuration (pydantic-settings).

All knobs live here so the pipeline is provider-swappable and host-agnostic.
Values come from environment variables / the project-root ``.env`` (which holds HF_TOKEN).
"""
from __future__ import annotations

from pathlib import Path
from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# .../call_analytics_app/src/call_analytics/settings.py
_HERE = Path(__file__).resolve()
APP_ROOT = _HERE.parents[2]          # call_analytics_app/
PROJECT_ROOT = _HERE.parents[3]      # test_huggingface_models/


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(PROJECT_ROOT / ".env", APP_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # --- LLM (swappable) ---
    llm_provider: str = "ollama"                 # "ollama" | "anthropic"
    ollama_model: str = "llama3.2"
    ollama_base_url: str = "http://localhost:11434"
    anthropic_model: str = "claude-opus-4-8"
    anthropic_api_key: str | None = None
    # heavier model for compliance/rollup judgments; falls back to the main model if unset
    judge_model: str | None = None

    # --- API server security ---
    api_key: str | None = None                   # shared secret required in X-API-Key header
    max_upload_mb: int = 50                       # reject /analyze uploads larger than this

    # --- secrets / audio models ---
    hf_token: str | None = None
    asr_model: str = "deepdml/faster-whisper-large-v3-turbo-ct2"
    diar_model: str = "pyannote/speaker-diarization-3.1"
    ser_model: str = "superb/wav2vec2-base-superb-er"
    device: str = "cuda"                         # "cuda" | "cpu"
    compute_type: str = "float16"                # faster-whisper compute type on GPU

    # --- pipeline knobs ---
    heatmap_bin_sec: int = 20
    trigger_drop: int = 2                        # customer sentiment drop that flags a trigger
    sentiment_batch_size: int = 20
    max_workers: int = 4
    max_transcript_chars: int = 8000
    min_ser_sec: float = 0.4                     # skip turns shorter than this for audio emotion
    beam_size: int = 5

    # --- paths ---
    data_dir: Path = PROJECT_ROOT / "data"
    output_dir: Path = APP_ROOT / "outputs"

    # --- proprietary prompts (loaded from .env; absent from the repo) ---
    # Use \n in .env for line breaks; expanded by the validator below.
    judge_prompt: str = ""
    followup_prompt: str = ""
    role_prompt: str = ""
    rollup_prompt: str = ""
    sent_prompt: str = ""
    followup_actions_prompt: str = ""

    # --- proprietary compliance rule texts (loaded from .env by rule id) ---
    rubric_purpose_disclosure: str = ""
    rubric_recording_disclosure: str = ""
    rubric_identity_verification: str = ""
    rubric_no_guarantees: str = ""
    rubric_no_sensitive_data_insecure: str = ""
    rubric_no_remote_access: str = ""
    rubric_no_fund_movement: str = ""
    rubric_professional_conduct: str = ""

    @field_validator(
        "judge_prompt", "followup_prompt", "role_prompt", "rollup_prompt", "sent_prompt",
        "followup_actions_prompt",
    )
    @classmethod
    def _expand_newlines(cls, v: str) -> str:
        # .env stores prompts single-line with literal \n; turn them into real
        # newlines. No-op if the loader already expanded them.
        return v.replace("\\n", "\n") if v else v

    @property
    def judge_model_name(self) -> str:
        """Model used for compliance/rollup; defaults to the provider's main model."""
        if self.judge_model:
            return self.judge_model
        return self.ollama_model if self.llm_provider == "ollama" else self.anthropic_model

    def prompt(self, name: str) -> str:
        """Return a required prompt template, failing loudly if it isn't in .env."""
        val = getattr(self, name, "")
        if not val:
            raise RuntimeError(
                f"{name.upper()} is empty — add it to call_analytics_app/.env "
                "(proprietary prompts are not stored in the repo)."
            )
        return val

    @property
    def financial_rubric(self) -> list[dict]:
        """Build the compliance rubric from the per-rule texts in .env."""
        from .rubrics import RULE_IDS

        rules = []
        for rid in RULE_IDS:
            text = getattr(self, f"rubric_{rid}", "")
            if not text:
                raise RuntimeError(
                    f"RUBRIC_{rid.upper()} is empty — add it to call_analytics_app/.env."
                )
            rules.append({"id": rid, "rule": text})
        return rules


@lru_cache
def get_settings() -> Settings:
    return Settings()
