import threading

from faster_whisper import WhisperModel

from . import config

_model = None
_model_lock = threading.Lock()


def get_model() -> WhisperModel:
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                _model = WhisperModel(
                    config.WHISPER_MODEL_SIZE,
                    device="cpu",
                    compute_type=config.WHISPER_COMPUTE_TYPE,
                )
    return _model


def transcribe(audio_path: str) -> dict:
    """Transcribes the given audio file.

    Returns dict: {text, avg_logprob_confidence, low_confidence, no_speech}
    """
    model = get_model()
    segments, info = model.transcribe(audio_path, beam_size=1, vad_filter=True)

    pieces = []
    logprobs = []
    for segment in segments:
        pieces.append(segment.text.strip())
        logprobs.append(segment.avg_logprob)

    text = " ".join(p for p in pieces if p).strip()
    avg_logprob = sum(logprobs) / len(logprobs) if logprobs else None

    # faster-whisper avg_logprob is typically in [-1, 0]; below -0.8 tends to mean
    # noisy/unclear audio the model wasn't confident about.
    low_confidence = avg_logprob is not None and avg_logprob < -0.8

    return {
        "text": text,
        "avg_logprob": avg_logprob,
        "low_confidence": low_confidence,
        "no_speech": len(text) == 0,
        "language": info.language,
    }
