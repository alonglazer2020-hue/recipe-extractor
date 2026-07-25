import os

from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
WHISPER_MODEL_SIZE = os.environ.get("WHISPER_MODEL_SIZE", "base")
WHISPER_COMPUTE_TYPE = os.environ.get("WHISPER_COMPUTE_TYPE", "int8")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-flash-latest")
JOB_WORKDIR = os.environ.get("JOB_WORKDIR", "/tmp/recipe-extractor")
JOB_TTL_SECONDS = int(os.environ.get("JOB_TTL_SECONDS", "3600"))
