import glob
import os
import uuid

import yt_dlp

from . import config


class DownloadError(Exception):
    """Raised when a video can't be downloaded, with a user-facing message."""


def _friendly_message(url: str, raw_error: str) -> str:
    lowered = raw_error.lower()
    if "private" in lowered or "login" in lowered or "sign in" in lowered:
        return "This video is private or requires login — it can't be downloaded."
    if "unsupported url" in lowered or "no extractor" in lowered:
        return "This link isn't a supported TikTok, Instagram Reels, or YouTube video URL."
    if "unavailable" in lowered or "removed" in lowered or "404" in lowered:
        return "This video appears to be unavailable or was removed."
    if "geo" in lowered or "not available in your country" in lowered:
        return "This video isn't available in this region."
    if "rate" in lowered or "429" in lowered or "too many requests" in lowered:
        return "The platform is rate-limiting downloads right now — try again in a bit."
    return (
        "Couldn't download this video. TikTok and Instagram actively block "
        "automated downloads and their formats change often — if this keeps "
        "happening, a YouTube link is the most reliable option."
    )


def download_audio_and_metadata(url: str) -> dict:
    """Downloads best-audio for the given URL and returns metadata + local audio path.

    Returns dict: {audio_path, title, description, source_extractor, duration}
    """
    job_dir = os.path.join(config.JOB_WORKDIR, uuid.uuid4().hex)
    os.makedirs(job_dir, exist_ok=True)

    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": os.path.join(job_dir, "%(id)s.%(ext)s"),
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "wav",
                "preferredquality": "192",
            }
        ],
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "socket_timeout": 30,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
    except yt_dlp.utils.DownloadError as e:
        raise DownloadError(_friendly_message(url, str(e))) from e

    wav_files = glob.glob(os.path.join(job_dir, "*.wav"))
    if not wav_files:
        raise DownloadError(
            "Downloaded the video but couldn't extract an audio track from it."
        )

    return {
        "audio_path": wav_files[0],
        "title": info.get("title") or "",
        "description": info.get("description") or "",
        "source_extractor": info.get("extractor_key") or info.get("extractor") or "",
        "duration": info.get("duration"),
        "job_dir": job_dir,
    }
