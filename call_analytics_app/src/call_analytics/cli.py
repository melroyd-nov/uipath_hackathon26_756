"""CLI: `python -m call_analytics run <audio_file>` (or the `call-analytics` console script)."""
from __future__ import annotations

import argparse
import json
import sys


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="call-analytics",
                                     description="Call-center audio analytics pipeline")
    sub = parser.add_subparsers(dest="cmd", required=True)
    run = sub.add_parser("run", help="analyze an audio file and print the CallReport")
    run.add_argument("audio", help="path to an audio file (mp3/wav/...)")
    args = parser.parse_args(argv)

    if args.cmd == "run":
        from .pipeline import analyze_call
        report = analyze_call(args.audio)
        print(json.dumps(report.model_dump(), indent=2, ensure_ascii=False))
        artifacts = report.artifacts
        if artifacts:
            print("\nArtifacts:", file=sys.stderr)
            for k, v in artifacts.items():
                print(f"  {k}: {v}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
