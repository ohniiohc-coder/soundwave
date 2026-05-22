import io
from dataclasses import dataclass, field
from mutagen import File as MutagenFile
from mutagen.mp3 import MP3
from mutagen.flac import FLAC
from mutagen.mp4 import MP4
from mutagen.id3 import ID3NoHeaderError


@dataclass
class AudioMetadata:
    title: str | None = None
    artist: str | None = None
    album: str | None = None
    album_artist: str | None = None
    track_number: int | None = None
    disc_number: int | None = None
    release_year: int | None = None
    genre: str | None = None
    duration_seconds: int | None = None
    bitrate: int | None = None
    format: str | None = None
    cover_art_bytes: bytes | None = None
    cover_art_mime: str = "image/jpeg"


def _parse_track_number(raw: str | None) -> int | None:
    if not raw:
        return None
    try:
        return int(str(raw).split("/")[0])
    except (ValueError, TypeError):
        return None


def extract_metadata(file_bytes: bytes, filename: str) -> AudioMetadata:
    meta = AudioMetadata()
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    meta.format = ext

    try:
        audio = MutagenFile(io.BytesIO(file_bytes), easy=True)
        if audio is None:
            return meta

        # Duration & bitrate
        if hasattr(audio, "info"):
            info = audio.info
            if hasattr(info, "length"):
                meta.duration_seconds = int(info.length)
            if hasattr(info, "bitrate"):
                meta.bitrate = info.bitrate // 1000 if info.bitrate else None

        # Tag helpers
        def get_tag(keys: list[str]) -> str | None:
            for k in keys:
                v = audio.get(k)
                if v:
                    return str(v[0]) if isinstance(v, list) else str(v)
            return None

        meta.title = get_tag(["title", "TIT2"])
        meta.artist = get_tag(["artist", "TPE1"])
        meta.album = get_tag(["album", "TALB"])
        meta.album_artist = get_tag(["albumartist", "TPE2"])
        meta.genre = get_tag(["genre", "TCON"])
        meta.track_number = _parse_track_number(get_tag(["tracknumber", "TRCK"]))
        meta.disc_number = _parse_track_number(get_tag(["discnumber", "TPOS"]))

        year_raw = get_tag(["date", "year", "TDRC", "TYER"])
        if year_raw:
            try:
                meta.release_year = int(str(year_raw)[:4])
            except (ValueError, TypeError):
                pass

    except Exception:
        pass

    # Cover art (non-easy mode)
    try:
        audio_full = MutagenFile(io.BytesIO(file_bytes))
        if audio_full is None:
            return meta

        # MP3 ID3
        if hasattr(audio_full, "tags") and audio_full.tags:
            for tag in audio_full.tags.values():
                if hasattr(tag, "mime") and hasattr(tag, "data"):
                    meta.cover_art_bytes = tag.data
                    meta.cover_art_mime = tag.mime
                    break

        # FLAC
        if isinstance(audio_full, FLAC) and audio_full.pictures:
            pic = audio_full.pictures[0]
            meta.cover_art_bytes = pic.data
            meta.cover_art_mime = pic.mime

        # MP4/M4A
        if isinstance(audio_full, MP4):
            covr = audio_full.tags.get("covr") if audio_full.tags else None
            if covr:
                meta.cover_art_bytes = bytes(covr[0])
                meta.cover_art_mime = "image/jpeg"

    except Exception:
        pass

    return meta
