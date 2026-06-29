# Call Analytics (LangGraph + LangChain)

Production-shaped port of the validated notebook `notebooks/call_analytics.ipynb`. The 10-stage
call-center pipeline is now a typed **LangGraph** `StateGraph`, with **LangChain** (structured Pydantic
output) for the LLM stages, a swappable LLM provider, and **Library + CLI + FastAPI** interfaces.

> Built UiPath-agnostic on purpose. A UiPath Coded Agent later is a thin wrapper around
> `analyze_call(audio_path) -> CallReport`.

## Pipeline (the graph)

```
load_audio → transcribe → diarize → align → roles → sentiment
          → emotion → compliance → followup → rollup → persist
```
State = `CallState`; output = `CallReport` (Pydantic). Stages reuse the verified notebook logic:
faster-whisper (ASR), pyannote 3.1 (diarization), word→speaker attribution, wav2vec2 (audio emotion),
and Ollama/Claude LLM calls for roles, numeric sentiment, compliance (per-rule judge + PII regex),
follow-up, and the call rollup.

## Layout

```
src/call_analytics/
  settings.py      pydantic-settings (provider, models, paths, thresholds)
  schemas.py       Pydantic models + CallReport (the contract) + CallState
  llm.py           get_llm()/structured() — ChatOllama | ChatAnthropic
  models_runtime.py  lazy singletons for ASR/pyannote/SER (+ Windows DLL/token setup)
  audio/           load, transcribe, diarize, align, emotion
  analysis/        roles, sentiment, heatmap+triggers, compliance, followup, rollup
  graph.py         LangGraph wiring;  pipeline.py  analyze_call();  outputs.py  JSON/CSV/PNG
  api/main.py      FastAPI;  cli.py  CLI
```

## Setup (local ML server)

This package is dual-purpose: a **light UiPath cloud orchestrator** (the deps in `pyproject.toml`)
and the **local ML server** that actually runs the audio models. The heavy ML stack is deliberately
**kept out of `pyproject.toml`** so the cloud package stays small — it lives in the tracked, pinned
`requirements-local-ml.txt`. A plain `uv sync` gives you only the light cloud deps; recreate the full
GPU runtime with:

```powershell
cd call_analytics_app

# Python 3.13 venv (matches the tested runtime; audioop-lts on 3.13)
uv venv --python 3.13 --clear

# project (light deps) + the pinned ML stack, via the CUDA cu128 torch index
uv pip install -e . -r requirements-local-ml.txt `
  --extra-index-url https://download.pytorch.org/whl/cu128 `
  --index-strategy unsafe-best-match

# torchcodec must stay uninstalled — its DLLs break the transformers/pyannote audio path
uv pip uninstall torchcodec

ollama pull llama3.2          # default LLM
ollama pull qwen2.5:7b        # sharper compliance/rollup -> set JUDGE_MODEL=qwen2.5:7b
```

Then copy `.env.example` to a local **`.env`**. The `*_PROMPT` / `RUBRIC_*` blocks are already
filled in (shared for hackathon judging); you only set `HF_TOKEN`, `API_KEY`, and optionally
`DATA_DIR` (absolute path to your audio dir, needed when the package lives outside the data
workspace). Provider swap: `LLM_PROVIDER=ollama` (default) or `anthropic` (set `ANTHROPIC_API_KEY`).

> Verified end-to-end on RTX 5060 (Blackwell, cu128), Python 3.13, torch 2.11.0+cu128 — one real
> call through the full graph (ASR → diarize → roles → sentiment → emotion → compliance → followup
> → rollup) producing a complete `CallReport`.

## Run

```powershell
# CLI — prints CallReport JSON, writes artifacts to call_analytics_app/outputs/
.venv\Scripts\python.exe -m call_analytics run data\audio_samples\call_00.mp3

# Library
python -c "from call_analytics import analyze_call; print(analyze_call('data/audio_samples/call_00.mp3').model_dump())"

# FastAPI (host 0.0.0.0 so ngrok can expose it to the UiPath cloud agent)
uv run uvicorn call_analytics.api.main:app --host 0.0.0.0 --port 8000
#   POST /analyze      (multipart file upload)
#   POST /analyze-path {"path": "data/audio_samples/call_00.mp3"}
#   GET  /health
```

Outputs (in `call_analytics_app/outputs/`): `call_<rec>.json`, `call_master.csv`, `heatmap_<rec>.png`.

## Test

```powershell
.venv\Scripts\python.exe -m pytest call_analytics_app/tests -m "not gpu"   # fast, pure logic
.venv\Scripts\python.exe -m pytest call_analytics_app/tests -m gpu          # full end-to-end
```

## Not yet (deferred)
- UiPath Coded Agent packaging.
- **No-GPU hosting:** the audio models need a GPU. To deploy where there's none, swap
  `audio/transcribe.py` + `audio/diarize.py` for a hosted ASR/diarization API (Deepgram/AssemblyAI);
  the rest of the graph is unchanged.
- Cross-call follow-up via a customer-history store (current follow-up is in-call only).
```
