FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /srv

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

ENV WHISPER_MODEL_SIZE=base
ENV WHISPER_COMPUTE_TYPE=int8

# Bake the whisper model into the image layer so there's no first-request download delay/failure.
RUN python -c "from faster_whisper import WhisperModel; WhisperModel('base', device='cpu', compute_type='int8')"

COPY app ./app

ENV JOB_WORKDIR=/tmp/recipe-extractor
ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
