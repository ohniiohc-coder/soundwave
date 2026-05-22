from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from uuid import UUID

from database import get_db
from models import Playlist, PlaylistTrack, Track
from schemas import PlaylistDetail, PlaylistTrackOut, TrackOut
from utils.storage import get_public_url, S3_BUCKET_IMAGES

router = APIRouter(prefix="/api/queue", tags=["queue"])


class QueueSave(BaseModel):
    track_ids: list[UUID]


def _enrich_track(t: Track) -> TrackOut:
    out = TrackOut.model_validate(t)
    out.stream_url = f"/api/tracks/{t.id}/stream"
    return out


async def _get_or_create_queue(db: AsyncSession) -> Playlist:
    result = await db.execute(select(Playlist).where(Playlist.is_default == True))
    pl = result.scalar_one_or_none()
    if not pl:
        pl = Playlist(name="재생 대기열", is_default=True)
        db.add(pl)
        await db.commit()
        await db.refresh(pl)
    return pl


@router.get("", response_model=PlaylistDetail)
async def get_queue(db: AsyncSession = Depends(get_db)):
    pl = await _get_or_create_queue(db)
    out = PlaylistDetail.model_validate(pl)
    out.track_count = len(pl.items)
    items = []
    for item in pl.items:
        cover = get_public_url(S3_BUCKET_IMAGES, item.track.album.cover_art_key) \
            if item.track.album and item.track.album.cover_art_key else None
        items.append(PlaylistTrackOut(
            id=item.id,
            track_id=item.track_id,
            position=item.position,
            added_at=item.added_at,
            cover_art_url=cover,
            artist_name=item.track.artist.name if item.track.artist else None,
            album_title=item.track.album.title if item.track.album else None,
            track=_enrich_track(item.track),
        ))
    out.items = items
    return out


@router.put("", status_code=204)
async def save_queue(data: QueueSave, db: AsyncSession = Depends(get_db)):
    pl = await _get_or_create_queue(db)

    existing = await db.execute(
        select(PlaylistTrack).where(PlaylistTrack.playlist_id == pl.id)
    )
    for item in existing.scalars().all():
        await db.delete(item)

    for pos, track_id in enumerate(data.track_ids):
        t_res = await db.execute(select(Track).where(Track.id == track_id))
        if t_res.scalar_one_or_none():
            db.add(PlaylistTrack(playlist_id=pl.id, track_id=track_id, position=pos))

    await db.commit()
