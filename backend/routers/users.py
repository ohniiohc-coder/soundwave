from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID
from typing import Optional
from datetime import datetime
from pydantic import BaseModel as PydanticModel

from database import get_db
from models import User, Follow, FollowRequest, Playlist, Track
from schemas import UserPublicOut, PlaylistOut, FollowRequestOut, NowPlayingOut
from utils.auth import get_current_user, get_current_user_optional
from utils.storage import get_public_url, upload_file, delete_file, S3_BUCKET_IMAGES

router = APIRouter(prefix="/api/users", tags=["users"])


async def _build_public(
    user: User,
    viewer: Optional[User],
    db: AsyncSession,
) -> UserPublicOut:
    follower_count = (await db.execute(
        select(func.count()).where(Follow.following_id == user.id)
    )).scalar() or 0

    following_count = (await db.execute(
        select(func.count()).where(Follow.follower_id == user.id)
    )).scalar() or 0

    is_following = False
    has_pending_request = False
    if viewer and viewer.id != user.id:
        row = (await db.execute(
            select(Follow).where(Follow.follower_id == viewer.id, Follow.following_id == user.id)
        )).scalar_one_or_none()
        is_following = row is not None

        if not is_following:
            req = (await db.execute(
                select(FollowRequest).where(
                    FollowRequest.requester_id == viewer.id,
                    FollowRequest.target_id == user.id,
                )
            )).scalar_one_or_none()
            has_pending_request = req is not None

    is_online = bool(
        user.last_seen_at and
        (datetime.utcnow() - user.last_seen_at).total_seconds() < 300
    )

    can_see_activity = not user.is_private or is_following
    now_playing = None
    if can_see_activity and is_online and user.now_playing_track_id:
        track = (await db.execute(
            select(Track).where(Track.id == user.now_playing_track_id)
        )).scalar_one_or_none()
        if track:
            cover_art_url = None
            if track.album and track.album.cover_art_key:
                cover_art_url = get_public_url(S3_BUCKET_IMAGES, track.album.cover_art_key)
            now_playing = NowPlayingOut(
                track_id=track.id,
                title=track.title,
                artist_name=track.artist.name if track.artist else None,
                cover_art_url=cover_art_url,
            )

    avatar_url = get_public_url(S3_BUCKET_IMAGES, user.avatar_key) if user.avatar_key else None

    return UserPublicOut(
        id=user.id,
        display_name=user.display_name,
        username=user.username,
        bio=user.bio,
        avatar_url=avatar_url,
        is_private=user.is_private,
        follower_count=follower_count,
        following_count=following_count,
        is_following=is_following,
        has_pending_request=has_pending_request,
        is_online=is_online,
        now_playing=now_playing,
    )


# ── 사용자 검색 / 조회 ────────────────────────────────────────────────────────

@router.get("", response_model=list[UserPublicOut])
async def search_users(
    q: str = "",
    skip: int = 0,
    limit: int = 20,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User).where(User.is_active == True, User.role != "admin")
    if q.strip():
        pattern = f"%{q.strip()}%"
        stmt = stmt.where(
            (User.username.ilike(pattern)) | (User.display_name.ilike(pattern))
        )
    stmt = stmt.offset(skip).limit(limit)
    users = (await db.execute(stmt)).scalars().all()
    return [await _build_public(u, current_user, db) for u in users]


@router.get("/{user_id}", response_model=UserPublicOut)
async def get_user_profile(
    user_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    user = (await db.execute(select(User).where(User.username == user_id))).scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    return await _build_public(user, current_user, db)


# ── 팔로우 / 언팔로우 ────────────────────────────────────────────────────────

@router.post("/{user_id}/follow", status_code=status.HTTP_204_NO_CONTENT)
async def follow_user(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="자기 자신을 팔로우할 수 없습니다")

    target = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not target or not target.is_active:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

    existing_follow = (await db.execute(
        select(Follow).where(Follow.follower_id == current_user.id, Follow.following_id == user_id)
    )).scalar_one_or_none()
    if existing_follow:
        return

    if target.is_private:
        # 비공개 계정 → 팔로우 요청 생성
        existing_req = (await db.execute(
            select(FollowRequest).where(
                FollowRequest.requester_id == current_user.id,
                FollowRequest.target_id == user_id,
            )
        )).scalar_one_or_none()
        if not existing_req:
            db.add(FollowRequest(requester_id=current_user.id, target_id=user_id))
            await db.commit()
    else:
        # 공개 계정 → 바로 팔로우
        db.add(Follow(follower_id=current_user.id, following_id=user_id))
        await db.commit()


@router.delete("/{user_id}/follow", status_code=status.HTTP_204_NO_CONTENT)
async def unfollow_user(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = (await db.execute(
        select(Follow).where(Follow.follower_id == current_user.id, Follow.following_id == user_id)
    )).scalar_one_or_none()
    if row:
        await db.delete(row)
        await db.commit()
        return

    # 팔로우 요청 취소
    req = (await db.execute(
        select(FollowRequest).where(
            FollowRequest.requester_id == current_user.id,
            FollowRequest.target_id == user_id,
        )
    )).scalar_one_or_none()
    if req:
        await db.delete(req)
        await db.commit()


# ── 팔로워 / 팔로잉 목록 ─────────────────────────────────────────────────────

@router.get("/{user_id}/followers", response_model=list[UserPublicOut])
async def get_followers(
    user_id: UUID,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    target = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not target or not target.is_active:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

    rows = (await db.execute(
        select(User).join(Follow, Follow.follower_id == User.id).where(Follow.following_id == user_id)
    )).scalars().all()
    return [await _build_public(u, current_user, db) for u in rows]


@router.get("/{user_id}/following", response_model=list[UserPublicOut])
async def get_following(
    user_id: UUID,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    target = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not target or not target.is_active:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

    rows = (await db.execute(
        select(User).join(Follow, Follow.following_id == User.id).where(Follow.follower_id == user_id)
    )).scalars().all()
    return [await _build_public(u, current_user, db) for u in rows]


# ── 아바타 업로드 ────────────────────────────────────────────────────────────

@router.post("/me/avatar", response_model=UserPublicOut)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    content_type = file.content_type or "image/jpeg"
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="이미지 파일만 업로드할 수 있습니다")

    data = await file.read()
    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "jpg"
    key = f"avatars/{current_user.id}.{ext}"

    if current_user.avatar_key and current_user.avatar_key != key:
        try:
            delete_file(current_user.avatar_key, S3_BUCKET_IMAGES)
        except Exception:
            pass

    upload_file(data, key, S3_BUCKET_IMAGES, content_type)
    current_user.avatar_key = key
    await db.commit()

    return await _build_public(current_user, current_user, db)


# ── 지금 듣는 음악 업데이트 ──────────────────────────────────────────────────

class NowPlayingUpdate(PydanticModel):
    track_id: UUID | None = None


@router.put("/me/now-playing", status_code=status.HTTP_204_NO_CONTENT)
async def update_now_playing(
    body: NowPlayingUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.now_playing_track_id = body.track_id
    await db.commit()


# ── 팔로우 요청 관리 (수신자 기준) ───────────────────────────────────────────

@router.get("/me/requests", response_model=list[FollowRequestOut])
async def get_follow_requests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(
        select(FollowRequest).where(FollowRequest.target_id == current_user.id)
        .order_by(FollowRequest.created_at.desc())
    )).scalars().all()

    result = []
    for req in rows:
        requester = (await db.execute(select(User).where(User.id == req.requester_id))).scalar_one_or_none()
        if requester:
            result.append(FollowRequestOut(
                id=req.id,
                requester=await _build_public(requester, current_user, db),
                created_at=req.created_at,
            ))
    return result


@router.post("/me/requests/{request_id}/accept", status_code=status.HTTP_204_NO_CONTENT)
async def accept_follow_request(
    request_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    req = (await db.execute(
        select(FollowRequest).where(
            FollowRequest.id == request_id,
            FollowRequest.target_id == current_user.id,
        )
    )).scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="요청을 찾을 수 없습니다")

    existing = (await db.execute(
        select(Follow).where(Follow.follower_id == req.requester_id, Follow.following_id == current_user.id)
    )).scalar_one_or_none()
    if not existing:
        db.add(Follow(follower_id=req.requester_id, following_id=current_user.id))
    await db.delete(req)
    await db.commit()


@router.delete("/me/requests/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
async def reject_follow_request(
    request_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    req = (await db.execute(
        select(FollowRequest).where(
            FollowRequest.id == request_id,
            FollowRequest.target_id == current_user.id,
        )
    )).scalar_one_or_none()
    if req:
        await db.delete(req)
        await db.commit()


# ── 유저 공개 플레이리스트 ────────────────────────────────────────────────────

@router.get("/{user_id}/playlists", response_model=list[PlaylistOut])
async def get_user_playlists(
    user_id: UUID,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    target = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not target or not target.is_active:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

    is_self = current_user and current_user.id == target.id
    if target.is_private and not is_self:
        if not current_user:
            return []
        row = (await db.execute(
            select(Follow).where(Follow.follower_id == current_user.id, Follow.following_id == target.id)
        )).scalar_one_or_none()
        if not row:
            return []

    playlists = (await db.execute(
        select(Playlist).where(
            Playlist.user_id == target.id,
            Playlist.is_default == False,
        ).order_by(Playlist.created_at.desc())
    )).scalars().all()

    result = []
    for pl in playlists:
        cover_url = None
        if pl.items:
            first = pl.items[0]
            if first.track.album and first.track.album.cover_art_key:
                cover_url = get_public_url(S3_BUCKET_IMAGES, first.track.album.cover_art_key)
        result.append(PlaylistOut(
            id=pl.id,
            name=pl.name,
            track_count=len(pl.items),
            cover_art_url=cover_url,
            created_at=pl.created_at,
            updated_at=pl.updated_at,
        ))
    return result
