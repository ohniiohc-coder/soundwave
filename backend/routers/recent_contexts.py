from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from uuid import UUID

from database import get_db
from models import User
from utils.auth import get_current_user

router = APIRouter(prefix="/api/recent-contexts", tags=["recent-contexts"])


class RecentContextIn(BaseModel):
    context_type: str   # 'album' | 'playlist'
    context_id: UUID
    context_name: str


class RecentContextOut(BaseModel):
    context_type: str
    context_id: str
    context_name: str


@router.get("", response_model=list[RecentContextOut])
async def get_recent_contexts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.execute(
        text(
            "SELECT context_type, context_id::text, context_name "
            "FROM recent_contexts "
            "WHERE user_id = :uid "
            "ORDER BY played_at DESC LIMIT 5"
        ),
        {"uid": str(current_user.id)},
    )
    return [RecentContextOut(context_type=r[0], context_id=r[1], context_name=r[2]) for r in rows.fetchall()]


@router.post("", status_code=204)
async def upsert_recent_context(
    data: RecentContextIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        text("""
            INSERT INTO recent_contexts (context_type, context_id, context_name, user_id, played_at)
            VALUES (:type, :id, :name, :uid, NOW())
            ON CONFLICT (context_id, user_id) DO UPDATE
              SET context_name = EXCLUDED.context_name,
                  played_at    = NOW()
        """),
        {"type": data.context_type, "id": str(data.context_id), "name": data.context_name, "uid": str(current_user.id)},
    )
    # 유저별 5개 초과분 삭제
    await db.execute(
        text("""
            DELETE FROM recent_contexts
            WHERE user_id = :uid AND context_id NOT IN (
              SELECT context_id FROM recent_contexts
              WHERE user_id = :uid
              ORDER BY played_at DESC LIMIT 5
            )
        """),
        {"uid": str(current_user.id)},
    )
    await db.commit()
