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
    source_url: str
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


def create_job(url: str) -> Job:
    with _lock:
        _prune_old_jobs()
        job = Job(id=uuid.uuid4().hex, source_url=url)
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

    job_dir = None
    try:
        _update(job, status=DOWNLOADING, message="Downloading video and reading its caption...")
        meta = download_audio_and_metadata(job.source_url)
        job_dir = meta.get("job_dir")

        _update(job, status=TRANSCRIBING, message="Transcribing the audio...")
        transcript_meta = transcribe(meta["audio_path"])

        _update(job, status=EXTRACTING, message="Extracting the recipe...")
        extraction = extract_recipe(
            title=meta["title"],
            description=meta["description"],
            transcript=transcript_meta["text"],
            transcript_meta=transcript_meta,
        )

        result = extraction.model_dump()
        result["source_url"] = job.source_url
        result["source_title"] = meta["title"]
        result["source_platform"] = meta["source_extractor"]

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
        if job_dir:
            shutil.rmtree(job_dir, ignore_errors=True)
