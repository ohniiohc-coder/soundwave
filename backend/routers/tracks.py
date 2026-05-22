import os
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from botocore.exceptions import ClientError

from database import get_db
from models import Track
from schemas import TrackOut, TrackUpdate, TrackDetail
from utils.storage import (
    get_public_url, get_s3_client, delete_file,
    S3_BUCKET_MUSIC, S3_BUCKET_IMAGES,
)
from utils.auth import verify_admin

router = APIRouter(prefix="/api/tracks", tags=["tracks"])


def _enrich_track(track: Track) -> TrackOut:
    out = TrackOut.model_validate(track)
    out.stream_url = f"/api/tracks/{track.id}/stream"
    return out


@router.get("", response_model=list[TrackOut])
async def list_tracks(skip: int = 0, limit: int = 50, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Track).offset(skip).limit(limit).order_by(Track.created_at.desc()))
    return [_enrich_track(t) for t in result.scalars().all()]


@router.get("/{track_id}", response_model=TrackDetail)
async def get_track(track_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Track).where(Track.id == track_id))
    track = result.scalar_one_or_none()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    out = TrackDetail.model_validate(track)
    out.stream_url = f"/api/tracks/{track_id}/stream"
    if track.album and track.album.cover_art_key:
        out.album.cover_art_url = get_public_url(S3_BUCKET_IMAGES, track.album.cover_art_key)
    return out


@router.get("/{track_id}/stream")
async def stream_track(track_id: UUID, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Track).where(Track.id == track_id))
    track = result.scalar_one_or_none()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    client = get_s3_client()

    # HTTP Range 헤더 지원
    range_header = request.headers.get("Range")
    kwargs = {"Bucket": S3_BUCKET_MUSIC, "Key": track.file_key}
    if range_header:
        kwargs["Range"] = range_header

    try:
        s3_obj = client.get_object(**kwargs)
    except ClientError as e:
        code = e.response["Error"]["Code"]
        if code in ("NoSuchKey", "404"):
            raise HTTPException(status_code=404, detail="Audio file not found")
        raise HTTPException(status_code=502, detail=f"Storage error: {code}")

    # mp3 → audio/mpeg, 나머지는 그대로
    fmt = (track.format or "mpeg").lower()
    mime = "audio/mpeg" if fmt == "mp3" else f"audio/{fmt}"

    headers = {
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-cache",
    }
    if "ContentRange" in s3_obj:
        headers["Content-Range"] = s3_obj["ContentRange"]
    if "ContentLength" in s3_obj:
        headers["Content-Length"] = str(s3_obj["ContentLength"])

    status_code = 206 if range_header else 200

    def iter_body():
        for chunk in s3_obj["Body"].iter_chunks(chunk_size=65536):
            yield chunk

    return StreamingResponse(iter_body(), status_code=status_code, headers=headers, media_type=mime)


@router.put("/{track_id}", response_model=TrackOut)
async def update_track(track_id: UUID, data: TrackUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Track).where(Track.id == track_id))
    track = result.scalar_one_or_none()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(track, k, v)
    await db.commit()
    await db.refresh(track)
    return _enrich_track(track)


@router.delete("/{track_id}", status_code=204)
async def delete_track(
    track_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_admin),
):
    result = await db.execute(select(Track).where(Track.id == track_id))
    track = result.scalar_one_or_none()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    # S3에서 오디오 파일 삭제
    try:
        delete_file(track.file_key, S3_BUCKET_MUSIC)
    except Exception:
        pass
    await db.delete(track)
    await db.commit()
