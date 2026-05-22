from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from uuid import UUID
from pydantic import BaseModel

from database import get_db
from models import Playlist, PlaylistTrack, Track
from schemas import (
    PlaylistOut, PlaylistDetail, PlaylistCreate, PlaylistUpdate,
    PlaylistAddTrack, PlaylistTrackOut, TrackOut,
)
from utils.storage import get_public_url, S3_BUCKET_IMAGES


class ReorderRequest(BaseModel):
    track_ids: list[UUID]

router = APIRouter(prefix="/api/playlists", tags=["playlists"])


def _enrich_track(t: Track) -> TrackOut:
    out = TrackOut.model_validate(t)
    out.stream_url = f"/api/tracks/{t.id}/stream"
    return out


def _playlist_out(pl: Playlist) -> PlaylistOut:
    out = PlaylistOut.model_validate(pl)
    out.track_count = len(pl.items)
    return out


def _build_items(pl: Playlist) -> list[PlaylistTrackOut]:
    result = []
    for item in pl.items:
        cover = get_public_url(S3_BUCKET_IMAGES, item.track.album.cover_art_key) \
            if item.track.album and item.track.album.cover_art_key else None
        result.append(PlaylistTrackOut(
            id=item.id,
            track_id=item.track_id,
            position=item.position,
            added_at=item.added_at,
            cover_art_url=cover,
            artist_name=item.track.artist.name if item.track.artist else None,
            album_title=item.track.album.title if item.track.album else None,
            track=_enrich_track(item.track),
        ))
    return result


@router.get("", response_model=list[PlaylistOut])
async def list_playlists(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Playlist).where(Playlist.is_default == False).order_by(Playlist.created_at.desc())
    )
    return [_playlist_out(p) for p in result.scalars().all()]


@router.post("", response_model=PlaylistOut, status_code=status.HTTP_201_CREATED)
async def create_playlist(data: PlaylistCreate, db: AsyncSession = Depends(get_db)):
    pl = Playlist(name=data.name)
    db.add(pl)
    await db.commit()
    await db.refresh(pl)
    return _playlist_out(pl)


@router.get("/{playlist_id}", response_model=PlaylistDetail)
async def get_playlist(playlist_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Playlist).where(Playlist.id == playlist_id))
    pl = result.scalar_one_or_none()
    if not pl:
        raise HTTPException(status_code=404, detail="Playlist not found")
    out = PlaylistDetail.model_validate(pl)
    out.track_count = len(pl.items)
    out.items = _build_items(pl)
    return out


@router.put("/{playlist_id}", response_model=PlaylistOut)
async def update_playlist(playlist_id: UUID, data: PlaylistUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Playlist).where(Playlist.id == playlist_id))
    pl = result.scalar_one_or_none()
    if not pl:
        raise HTTPException(status_code=404, detail="Playlist not found")
    pl.name = data.name
    await db.commit()
    await db.refresh(pl)
    return _playlist_out(pl)


@router.delete("/{playlist_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_playlist(playlist_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Playlist).where(Playlist.id == playlist_id))
    pl = result.scalar_one_or_none()
    if not pl or pl.is_default:
        raise HTTPException(status_code=404, detail="Playlist not found")
    await db.delete(pl)
    await db.execute(text("DELETE FROM recent_contexts WHERE context_id = :id"), {"id": str(playlist_id)})
    await db.commit()


@router.post("/{playlist_id}/tracks", response_model=PlaylistOut, status_code=status.HTTP_201_CREATED)
async def add_track(playlist_id: UUID, data: PlaylistAddTrack, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Playlist).where(Playlist.id == playlist_id))
    pl = result.scalar_one_or_none()
    if not pl:
        raise HTTPException(status_code=404, detail="Playlist not found")

    t_res = await db.execute(select(Track).where(Track.id == data.track_id))
    if not t_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Track not found")

    dup = await db.execute(select(PlaylistTrack).where(
        PlaylistTrack.playlist_id == playlist_id,
        PlaylistTrack.track_id == data.track_id,
    ))
    if not dup.scalar_one_or_none():
        db.add(PlaylistTrack(playlist_id=playlist_id, track_id=data.track_id, position=len(pl.items)))
        await db.commit()
        await db.refresh(pl)
    return _playlist_out(pl)


@router.put("/{playlist_id}/tracks/reorder", status_code=status.HTTP_204_NO_CONTENT)
async def reorder_tracks(playlist_id: UUID, data: ReorderRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Playlist).where(Playlist.id == playlist_id))
    pl = result.scalar_one_or_none()
    if not pl:
        raise HTTPException(status_code=404, detail="Playlist not found")

    # track_ids 순서대로 position 업데이트
    for pos, track_id in enumerate(data.track_ids):
        item_result = await db.execute(select(PlaylistTrack).where(
            PlaylistTrack.playlist_id == playlist_id,
            PlaylistTrack.track_id == track_id,
        ))
        item = item_result.scalar_one_or_none()
        if item:
            item.position = pos
    await db.commit()


@router.delete("/{playlist_id}/tracks/{track_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_track(playlist_id: UUID, track_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PlaylistTrack).where(
        PlaylistTrack.playlist_id == playlist_id,
        PlaylistTrack.track_id == track_id,
    ))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Track not in playlist")
    await db.delete(item)
    await db.commit()
