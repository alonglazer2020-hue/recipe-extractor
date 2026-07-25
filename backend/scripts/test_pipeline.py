"""CLI harness to prove the pipeline works before wiring up the mobile app.

Usage:
    python scripts/test_pipeline.py "<video url>"          # download + transcribe only
    python scripts/test_pipeline.py "<video url>" --full    # also runs Gemini extraction
"""

import argparse
import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.downloader import DownloadError, download_audio_and_metadata  # noqa: E402
from app.transcriber import transcribe  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("url")
    parser.add_argument("--full", action="store_true", help="also run Gemini extraction")
    args = parser.parse_args()

    print(f"Downloading: {args.url}")
    try:
        meta = download_audio_and_metadata(args.url)
    except DownloadError as e:
        print(f"DOWNLOAD FAILED: {e}")
        sys.exit(1)

    print(f"  title: {meta['title']}")
    print(f"  extractor: {meta['source_extractor']}")
    print(f"  duration: {meta['duration']}s")
    print(f"  caption: {meta['description'][:300]!r}")
    print(f"  audio: {meta['audio_path']}")

    print("\nTranscribing...")
    t = transcribe(meta["audio_path"])
    print(f"  language: {t['language']}")
    print(f"  low_confidence: {t['low_confidence']}")
    print(f"  no_speech: {t['no_speech']}")
    print(f"  transcript:\n{t['text']}")

    if args.full:
        from app.extractor import extract_recipe

        print("\nExtracting recipe via Gemini...")
        result = extract_recipe(
            title=meta["title"],
            description=meta["description"],
            transcript=t["text"],
            transcript_meta=t,
        )
        print(json.dumps(result.model_dump(), indent=2))


if __name__ == "__main__":
    main()
