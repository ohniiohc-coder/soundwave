"""
music_processing_dag

음악 파일 업로드 후 FastAPI가 이 DAG을 트리거합니다.
주요 역할:
  1. S3에서 파일 다운로드 후 메타데이터 재검증/보강
  2. 앨범 아트가 없는 경우 커버 이미지 생성 (placeholder)
  3. 트랙/앨범 DB 레코드 업데이트
"""

from __future__ import annotations

import io
import os
import uuid
import logging
from datetime import datetime, timedelta

from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.models.param import Param

log = logging.getLogger(__name__)

# ─── 환경 변수 ────────────────────────────────────────────────────────────────
S3_ENDPOINT_URL = os.getenv("S3_ENDPOINT_URL", "http://minio:9000")
S3_ACCESS_KEY = os.getenv("S3_ACCESS_KEY", "minioadmin")
S3_SECRET_KEY = os.getenv("S3_SECRET_KEY", "minioadmin")
S3_BUCKET_MUSIC = os.getenv("S3_BUCKET_MUSIC", "music-files")
S3_BUCKET_IMAGES = os.getenv("S3_BUCKET_IMAGES", "music-images")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://music:musicpassword@postgres:5432/musicdb")

DEFAULT_ARGS = {
    "owner": "airflow",
    "depends_on_past": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=2),
}


# ─── Task 함수 ────────────────────────────────────────────────────────────────

def get_s3_client():
    import boto3
    from botocore.config import Config
    return boto3.client(
        "s3",
        endpoint_url=S3_ENDPOINT_URL,
        aws_access_key_id=S3_ACCESS_KEY,
        aws_secret_access_key=S3_SECRET_KEY,
        region_name="us-east-1",
        config=Config(signature_version="s3v4"),
    )


def get_db_engine():
    from sqlalchemy import create_engine
    sync_url = DATABASE_URL.replace("+asyncpg", "+psycopg2").replace("+asyncio", "")
    return create_engine(sync_url)


def task_verify_metadata(**context):
    """S3에서 파일을 읽어 메타데이터를 재추출하고 XCom에 저장."""
    conf = context["dag_run"].conf or {}
    track_id = conf.get("track_id")
    file_key = conf.get("file_key")

    if not track_id or not file_key:
        log.warning("No track_id or file_key in conf, skipping.")
        return {}

    log.info(f"Verifying metadata for track {track_id}, file {file_key}")
    client = get_s3_client()

    try:
        obj = client.get_object(Bucket=S3_BUCKET_MUSIC, Key=file_key)
        file_bytes = obj["Body"].read()
    except Exception as e:
        log.error(f"Failed to download {file_key}: {e}")
        return {}

    # mutagen 메타데이터 추출
    from mutagen import File as MutagenFile
    from mutagen.flac import FLAC
    from mutagen.mp4 import MP4

    meta = {}
    try:
        audio = MutagenFile(io.BytesIO(file_bytes), easy=True)
        if audio:
            def g(keys):
                for k in keys:
                    v = audio.get(k)
                    if v:
                        return str(v[0])
                return None

            meta["title"] = g(["title"])
            meta["artist"] = g(["artist", "albumartist"])
            meta["album"] = g(["album"])
            meta["genre"] = g(["genre"])
            meta["track_number"] = g(["tracknumber"])
            year_raw = g(["date", "year"])
            meta["release_year"] = int(year_raw[:4]) if year_raw and year_raw[:4].isdigit() else None

            if hasattr(audio, "info"):
                meta["duration_seconds"] = int(audio.info.length) if hasattr(audio.info, "length") else None
                meta["bitrate"] = (audio.info.bitrate // 1000) if hasattr(audio.info, "bitrate") and audio.info.bitrate else None

    except Exception as e:
        log.warning(f"Metadata extraction warning: {e}")

    context["ti"].xcom_push(key="metadata", value=meta)
    context["ti"].xcom_push(key="track_id", value=track_id)
    context["ti"].xcom_push(key="file_key", value=file_key)
    context["ti"].xcom_push(key="album_id", value=conf.get("album_id"))
    log.info(f"Extracted metadata: {meta}")
    return meta


def task_check_cover_art(**context):
    """앨범에 커버 아트가 없으면 임베디드 이미지를 추출해서 저장."""
    ti = context["ti"]
    track_id = ti.xcom_pull(key="track_id")
    file_key = ti.xcom_pull(key="file_key")
    album_id = ti.xcom_pull(key="album_id")

    if not track_id or not file_key or not album_id:
        log.info("Skipping cover art check - missing params")
        return

    # DB에서 앨범 커버 아트 확인
    from sqlalchemy import text
    engine = get_db_engine()
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT cover_art_key FROM albums WHERE id = :id"),
            {"id": album_id}
        ).fetchone()

    if row and row[0]:
        log.info(f"Album {album_id} already has cover art: {row[0]}")
        return

    # S3에서 파일 다운로드 후 임베디드 아트 추출
    client = get_s3_client()
    try:
        obj = client.get_object(Bucket=S3_BUCKET_MUSIC, Key=file_key)
        file_bytes = obj["Body"].read()
    except Exception as e:
        log.error(f"Failed to download file: {e}")
        return

    cover_bytes = None
    cover_mime = "image/jpeg"

    try:
        from mutagen import File as MutagenFile
        from mutagen.flac import FLAC
        from mutagen.mp4 import MP4

        audio = MutagenFile(io.BytesIO(file_bytes))
        if audio and hasattr(audio, "tags") and audio.tags:
            for tag in audio.tags.values():
                if hasattr(tag, "data") and hasattr(tag, "mime"):
                    cover_bytes = tag.data
                    cover_mime = tag.mime
                    break

        if not cover_bytes and isinstance(audio, FLAC) and audio.pictures:
            cover_bytes = audio.pictures[0].data
            cover_mime = audio.pictures[0].mime

        if not cover_bytes and isinstance(audio, MP4) and audio.tags:
            covr = audio.tags.get("covr")
            if covr:
                cover_bytes = bytes(covr[0])

    except Exception as e:
        log.warning(f"Cover art extraction failed: {e}")

    if not cover_bytes:
        log.info("No embedded cover art found")
        return

    # S3에 커버 아트 업로드
    art_key = f"covers/{album_id}/{uuid.uuid4()}.jpg"
    client.put_object(
        Bucket=S3_BUCKET_IMAGES,
        Key=art_key,
        Body=cover_bytes,
        ContentType=cover_mime,
    )

    # DB 업데이트
    from sqlalchemy import text
    with engine.connect() as conn:
        conn.execute(
            text("UPDATE albums SET cover_art_key = :key WHERE id = :id AND cover_art_key IS NULL"),
            {"key": art_key, "id": album_id}
        )
        conn.commit()
    log.info(f"Cover art saved: {art_key}")


def task_update_track_db(**context):
    """추출한 메타데이터로 track 레코드를 보강."""
    ti = context["ti"]
    track_id = ti.xcom_pull(key="track_id")
    meta = ti.xcom_pull(key="metadata") or {}

    if not track_id or not meta:
        log.info("Nothing to update")
        return

    from sqlalchemy import text
    engine = get_db_engine()

    updates = {}
    if meta.get("duration_seconds"):
        updates["duration_seconds"] = meta["duration_seconds"]
    if meta.get("bitrate"):
        updates["bitrate"] = meta["bitrate"]

    if not updates:
        log.info("No fields to update")
        return

    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    updates["id"] = track_id

    with engine.connect() as conn:
        conn.execute(
            text(f"UPDATE tracks SET {set_clause}, updated_at = NOW() WHERE id = :id"),
            updates
        )
        conn.commit()
    log.info(f"Track {track_id} updated: {updates}")


# ─── DAG 정의 ─────────────────────────────────────────────────────────────────

with DAG(
    dag_id="music_processing",
    default_args=DEFAULT_ARGS,
    description="음악 업로드 후 메타데이터 처리 파이프라인",
    schedule=None,  # 업로드 시 수동 트리거
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=["music", "processing"],
    params={
        "track_id": Param("", type="string", description="Track UUID"),
        "file_key": Param("", type="string", description="S3 file key"),
        "album_id": Param("", type="string", description="Album UUID"),
    },
) as dag:

    verify_metadata = PythonOperator(
        task_id="verify_metadata",
        python_callable=task_verify_metadata,
    )

    check_cover_art = PythonOperator(
        task_id="check_cover_art",
        python_callable=task_check_cover_art,
    )

    update_track_db = PythonOperator(
        task_id="update_track_db",
        python_callable=task_update_track_db,
    )

    verify_metadata >> check_cover_art >> update_track_db
