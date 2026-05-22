from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from database import get_db
from models import Track, Album, Artist
from schemas import SearchResult, TrackOut, AlbumOut, ArtistOut
from utils.storage import get_public_url, S3_BUCKET_IMAGES

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("", response_model=SearchResult)
async def search(q: str, limit: int = 20, db: AsyncSession = Depends(get_db)):
    pattern = f"%{q}%"

    tracks_r = await db.execute(
        select(Track).where(Track.title.ilike(pattern)).limit(limit)
    )
    albums_r = await db.execute(
        select(Album).where(Album.title.ilike(pattern)).limit(limit)
    )
    artists_r = await db.execute(
        select(Artist).where(Artist.name.ilike(pattern)).limit(limit)
    )

    tracks = []
    for t in tracks_r.scalars().all():
        out = TrackOut.model_validate(t)
        out.stream_url = f"/api/tracks/{t.id}/stream"
        tracks.append(out)

    albums = []
    for a in albums_r.scalars().all():
        out = AlbumOut.model_validate(a)
        if a.cover_art_key:
            out.cover_art_url = get_public_url(S3_BUCKET_IMAGES, a.cover_art_key)
        albums.append(out)

    artists = [ArtistOut.model_validate(a) for a in artists_r.scalars().all()]

    return SearchResult(tracks=tracks, albums=albums, artists=artists)
