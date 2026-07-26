import shutil
import threading
import time
import uuid
from dataclasses import dataclass, field
from typing import Optional

from . import config
from .downloader import DownloadError, download_audio_and_metadata
from .extractor import extract_recipe
from .transcriber import transcribe

QUEUED = "queued"
DOWNLOADING = "downloading"
TRANSCRIBING = "transcribing"
EXTRACTING = "extracting"
DONE = "done"
ERROR = "error"


@dataclass
class Job:
    id: str
    source_urls: list[str]
    note: Optional[str] = None
    status: str = QUEUED
    message: str = "Queued"
    result: Optional[dict] = None
    error: Optional[str] = None
    created_at: float = field(default_factory=time.time)


_jobs: dict[str, Job] = {}
_lock = threading.Lock()


def _prune_old_jobs() -> None:
    cutoff = time.time() - config.JOB_TTL_SECONDS
    stale = [jid for jid, j in _jobs.items() if j.created_at < cutoff]
    for jid in stale:
        _jobs.pop(jid, None)


def create_job(urls: list[str], note: Optional[str] = None) -> Job:
    with _lock:
        _prune_old_jobs()
        job = Job(id=uuid.uuid4().hex, source_urls=urls, note=note)
        _jobs[job.id] = job
    return job


def get_job(job_id: str) -> Optional[Job]:
    with _lock:
        return _jobs.get(job_id)


def _update(job: Job, **kwargs) -> None:
    with _lock:
        for k, v in kwargs.items():
            setattr(job, k, v)


def run_job(job_id: str) -> None:
    job = get_job(job_id)
    if job is None:
        return

    job_dirs: list[str] = []
    try:
        n = len(job.source_urls)
        sources = []
        for i, url in enumerate(job.source_urls):
            prefix = f"({i + 1}/{n}) " if n > 1 else ""

            _update(job, status=DOWNLOADING, message=f"{prefix}Downloading video and reading its caption...")
            meta = download_audio_and_metadata(url)
            if meta.get("job_dir"):
                job_dirs.append(meta["job_dir"])

            _update(job, status=TRANSCRIBING, message=f"{prefix}Transcribing the audio...")
            transcript_meta = transcribe(meta["audio_path"])

            sources.append(
                {
                    "url": url,
                    "title": meta["title"],
                    "description": meta["description"],
                    "platform": meta["source_extractor"],
                    "transcript": transcript_meta["text"],
                    "transcript_meta": transcript_meta,
                }
            )

        _update(job, status=EXTRACTING, message="Extracting the recipe...")
        extraction = extract_recipe(sources=sources, note=job.note)

        result = extraction.model_dump()
        result["sources"] = [
            {"url": s["url"], "title": s["title"], "platform": s["platform"]} for s in sources
        ]

        _update(job, status=DONE, message="Done", result=result)
    except DownloadError as e:
        _update(job, status=ERROR, message=str(e), error=str(e))
    except Exception as e:  # noqa: BLE001
        _update(
            job,
            status=ERROR,
            message="Something went wrong processing this video.",
            error=repr(e),
        )
    finally:
        for job_dir in job_dirs:
            shutil.rmtree(job_dir, ignore_errors=True)
