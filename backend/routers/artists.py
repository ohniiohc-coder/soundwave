import uuid as uuid_lib
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from database import get_db
from models import Artist, Album, Track
from schemas import ArtistOut, ArtistCreate, ArtistUpdate, ArtistDetail
from utils.storage import get_public_url, upload_file, delete_file, S3_BUCKET_IMAGES, S3_BUCKET_MUSIC
from utils.auth import verify_admin

router = APIRouter(prefix="/api/artists", tags=["artists"])


@router.get("", response_model=list[ArtistOut])
async def list_artists(skip: int = 0, limit: int = 50, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Artist).offset(skip).limit(limit).order_by(Artist.name))
    return result.scalars().all()


@router.get("/{artist_id}", response_model=ArtistDetail)
async def get_artist(artist_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Artist).where(Artist.id == artist_id))
    artist = result.scalar_one_or_none()
    if not artist:
        raise HTTPException(status_code=404, detail="Artist not found")
    out = ArtistDetail.model_validate(artist)
    for album in out.albums:
        if album.cover_art_key:
            album.cover_art_url = get_public_url(S3_BUCKET_IMAGES, album.cover_art_key)
    return out


@router.post("", response_model=ArtistOut, status_code=status.HTTP_201_CREATED)
async def create_artist(data: ArtistCreate, db: AsyncSession = Depends(get_db)):
    artist = Artist(**data.model_dump())
    db.add(artist)
    await db.commit()
    await db.refresh(artist)
    return artist


@router.put("/{artist_id}", response_model=ArtistOut)
async def update_artist(artist_id: UUID, data: ArtistUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Artist).where(Artist.id == artist_id))
    artist = result.scalar_one_or_none()
    if not artist:
        raise HTTPException(status_code=404, detail="Artist not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(artist, k, v)
    await db.commit()
    await db.refresh(artist)
    return artist


@router.post("/{artist_id}/image", response_model=ArtistOut)
async def upload_artist_image(
    artist_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_admin),
):
    result = await db.execute(select(Artist).where(Artist.id == artist_id))
    artist = result.scalar_one_or_none()
    if not artist:
        raise HTTPException(status_code=404, detail="Artist not found")

    content = await file.read()
    ext = (file.filename or "image.jpg").rsplit(".", 1)[-1].lower()
    key = f"artists/{artist_id}/{uuid_lib.uuid4()}.{ext}"
    upload_file(content, key, S3_BUCKET_IMAGES, file.content_type or "image/jpeg")

    artist.image_url = get_public_url(S3_BUCKET_IMAGES, key)
    await db.commit()
    await db.refresh(artist)
    return artist


@router.delete("/{artist_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_artist(
    artist_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_admin),
):
    result = await db.execute(select(Artist).where(Artist.id == artist_id))
    artist = result.scalar_one_or_none()
    if not artist:
        raise HTTPException(status_code=404, detail="Artist not found")

    # 앨범 조회
    albums_result = await db.execute(select(Album).where(Album.artist_id == artist_id))
    for album in albums_result.scalars().all():
        # 각 앨범의 트랙 S3 파일 삭제
        tracks_result = await db.execute(select(Track).where(Track.album_id == album.id))
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

    await db.delete(artist)
    await db.commit()
