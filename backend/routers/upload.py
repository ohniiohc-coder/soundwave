import uuid
import os
import httpx
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Track, Artist, Album
from schemas import UploadResponse
from utils.storage import upload_file, S3_BUCKET_MUSIC, S3_BUCKET_IMAGES
from utils.metadata import extract_metadata
from utils.auth import verify_admin

router = APIRouter(prefix="/api/upload", tags=["upload"])

AIRFLOW_URL = os.getenv("AIRFLOW_URL", "http://airflow-webserver:8080")
AIRFLOW_USER = os.getenv("AIRFLOW_USER", "admin")
AIRFLOW_PASSWORD = os.getenv("AIRFLOW_PASSWORD", "adminpassword")

ALLOWED_FORMATS = {"mp3", "flac", "m4a", "aac", "wav", "ogg"}


@router.post("", response_model=UploadResponse)
async def upload_music(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_admin),
):
    filename = file.filename or "unknown"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_FORMATS:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {ext}. Allowed: {ALLOWED_FORMATS}")

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    # 1. 메타데이터 추출 (mutagen)
    meta = extract_metadata(content, filename)

    # 2. S3에 오디오 파일 업로드
    track_id = uuid.uuid4()
    file_key = f"tracks/{track_id}/{filename}"
    upload_file(content, file_key, S3_BUCKET_MUSIC, f"audio/{ext}")

    # 3. 앨범 아트 업로드 (임베디드된 경우)
    cover_art_key = None
    if meta.cover_art_bytes:
        art_ext = meta.cover_art_mime.split("/")[-1] if meta.cover_art_mime else "jpg"
        cover_art_key = f"covers/temp/{track_id}.{art_ext}"
        upload_file(meta.cover_art_bytes, cover_art_key, S3_BUCKET_IMAGES, meta.cover_art_mime or "image/jpeg")

    # 4. 아티스트 resolve (없으면 생성)
    artist_name = meta.album_artist or meta.artist or "Unknown Artist"
    from sqlalchemy import select
    artist_result = await db.execute(select(Artist).where(Artist.name == artist_name))
    artist = artist_result.scalar_one_or_none()
    if not artist:
        artist = Artist(name=artist_name)
        db.add(artist)
        await db.flush()

    # 5. 앨범 resolve (없으면 생성)
    album_title = meta.album or "Unknown Album"
    album_result = await db.execute(
        select(Album).where(Album.title == album_title, Album.artist_id == artist.id)
    )
    album = album_result.scalar_one_or_none()
    if not album:
        album = Album(
            title=album_title,
            artist_id=artist.id,
            release_year=meta.release_year,
            genre=meta.genre,
            cover_art_key=cover_art_key,
        )
        db.add(album)
        await db.flush()
    elif cover_art_key and not album.cover_art_key:
        album.cover_art_key = cover_art_key

    # 6. 트랙 저장
    track = Track(
        id=track_id,
        title=meta.title or filename.rsplit(".", 1)[0],
        album_id=album.id,
        artist_id=artist.id,
        track_number=meta.track_number,
        disc_number=meta.disc_number or 1,
        duration_seconds=meta.duration_seconds,
        file_key=file_key,
        file_size=len(content),
        format=ext,
        bitrate=meta.bitrate,
    )
    db.add(track)
    await db.commit()

    # 7. Airflow DAG 트리거 (선택적 - 실패해도 업로드는 성공)
    dag_run_id = None
    try:
        dag_run_id = await _trigger_airflow_dag(str(track_id), file_key, str(album.id))
    except Exception:
        pass

    return UploadResponse(
        track_id=track_id,
        message="Upload successful",
        dag_run_id=dag_run_id,
    )


async def _trigger_airflow_dag(track_id: str, file_key: str, album_id: str) -> str | None:
    dag_run_id = f"upload_{track_id}"
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.post(
            f"{AIRFLOW_URL}/api/v1/dags/music_processing/dagRuns",
            json={
                "dag_run_id": dag_run_id,
                "conf": {
                    "track_id": track_id,
                    "file_key": file_key,
                    "album_id": album_id,
                },
            },
            auth=(AIRFLOW_USER, AIRFLOW_PASSWORD),
        )
        if resp.status_code in (200, 409):
            return dag_run_id
    return None
