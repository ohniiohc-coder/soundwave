import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from database import get_db
from models import Album, Track
from schemas import AlbumOut, AlbumCreate, AlbumUpdate, AlbumDetail
from utils.storage import upload_file, get_public_url, delete_file, S3_BUCKET_IMAGES, S3_BUCKET_MUSIC
from utils.auth import verify_admin

router = APIRouter(prefix="/api/albums", tags=["albums"])


def _enrich_album(album: Album) -> AlbumOut:
    out = AlbumOut.model_validate(album)
    if album.cover_art_key:
        out.cover_art_url = get_public_url(S3_BUCKET_IMAGES, album.cover_art_key)
    return out


@router.get("", response_model=list[AlbumOut])
async def list_albums(skip: int = 0, limit: int = 50, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Album).offset(skip).limit(limit).order_by(Album.title))
    albums = result.scalars().all()
    return [_enrich_album(a) for a in albums]


@router.get("/{album_id}", response_model=AlbumDetail)
async def get_album(album_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Album).where(Album.id == album_id))
    album = result.scalar_one_or_none()
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    out = AlbumDetail.model_validate(album)
    if album.cover_art_key:
        out.cover_art_url = get_public_url(S3_BUCKET_IMAGES, album.cover_art_key)
    return out


@router.post("", response_model=AlbumOut, status_code=status.HTTP_201_CREATED)
async def create_album(data: AlbumCreate, db: AsyncSession = Depends(get_db)):
    album = Album(**data.model_dump())
    db.add(album)
    await db.commit()
    await db.refresh(album)
    return _enrich_album(album)


@router.put("/{album_id}", response_model=AlbumOut)
async def update_album(album_id: UUID, data: AlbumUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Album).where(Album.id == album_id))
    album = result.scalar_one_or_none()
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(album, k, v)
    await db.commit()
    await db.refresh(album)
    return _enrich_album(album)


@router.post("/{album_id}/cover", response_model=AlbumOut)
async def upload_cover(
    album_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_admin),
):
    result = await db.execute(select(Album).where(Album.id == album_id))
    album = result.scalar_one_or_none()
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")

    content = await file.read()
    ext = (file.filename or "cover.jpg").rsplit(".", 1)[-1].lower()
    key = f"covers/{album_id}/{uuid.uuid4()}.{ext}"
    upload_file(content, key, S3_BUCKET_IMAGES, file.content_type or "image/jpeg")

    album.cover_art_key = key
    await db.commit()
    await db.refresh(album)
    return _enrich_album(album)


@router.delete("/{album_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_album(
    album_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_admin),
):
    result = await db.execute(select(Album).where(Album.id == album_id))
    album = result.scalar_one_or_none()
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")

    # 트랙 S3 파일 삭제
    tracks_result = await db.execute(select(Track).where(Track.album_id == album_id))
    for track in tracks_result.scalars().all():
        try:
            delete_file(track.file_key, S3_BUCKET_MUSIC)
        except Exception:
            pass
        await db.delete(track)

    # 커버 아트 S3 삭제
    if album.cover_art_key:
        try:
            delete_file(album.cover_art_key, S3_BUCKET_IMAGES)
        except Exception:
            pass

    await db.delete(album)
    await db.commit()
