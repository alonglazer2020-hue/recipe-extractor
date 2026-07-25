import logging
import threading

from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl

from . import jobs
from .transcriber import get_model

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("recipe-extractor")

app = FastAPI(title="Recipe Extractor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _warm_up_whisper_model() -> None:
    # Loads (and on first-ever run, downloads) the model in a background thread so
    # the server starts accepting requests immediately.
    threading.Thread(target=get_model, daemon=True).start()


class CreateJobRequest(BaseModel):
    url: HttpUrl


class JobResponse(BaseModel):
    job_id: str
    status: str
    message: str
    result: dict | None = None
    error: str | None = None


@app.get("/")
def health() -> dict:
    return {"ok": True, "service": "recipe-extractor"}


@app.post("/jobs", response_model=JobResponse)
def create_job(req: CreateJobRequest, background_tasks: BackgroundTasks) -> JobResponse:
    job = jobs.create_job(str(req.url))
    background_tasks.add_task(jobs.run_job, job.id)
    return JobResponse(job_id=job.id, status=job.status, message=job.message)


@app.get("/jobs/{job_id}", response_model=JobResponse)
def get_job(job_id: str) -> JobResponse:
    job = jobs.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found (it may have expired)")
    return JobResponse(
        job_id=job.id,
        status=job.status,
        message=job.message,
        result=job.result,
        error=job.error,
    )
