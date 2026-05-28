from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from uuid import UUID
from datetime import datetime

from database import get_db
from models import User, DirectMessage
from schemas import DirectMessageOut, DirectMessageCreate, ConversationOut, UserPublicOut
from routers.users import _build_public
from utils.auth import get_current_user

router = APIRouter(prefix="/api/messages", tags=["messages"])


def _msg_out(m: DirectMessage) -> DirectMessageOut:
    return DirectMessageOut(
        id=m.id,
        sender_id=m.sender_id,
        content=m.content,
        created_at=m.created_at,
        read_at=m.read_at,
    )


@router.get("/unread", response_model=dict)
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    count = (await db.execute(
        select(func.count()).where(
            DirectMessage.receiver_id == current_user.id,
            DirectMessage.read_at == None,
        )
    )).scalar() or 0
    return {"count": count}


@router.get("", response_model=list[ConversationOut])
async def get_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(
        select(DirectMessage.sender_id, DirectMessage.receiver_id).where(
            or_(
                DirectMessage.sender_id == current_user.id,
                DirectMessage.receiver_id == current_user.id,
            )
        )
    )).all()

    partner_ids: set[UUID] = set()
    for sender_id, receiver_id in rows:
        other = receiver_id if sender_id == current_user.id else sender_id
        partner_ids.add(other)

    result = []
    for partner_id in partner_ids:
        partner = (await db.execute(select(User).where(User.id == partner_id))).scalar_one_or_none()
        if not partner or not partner.is_active:
            continue

        latest = (await db.execute(
            select(DirectMessage).where(
                or_(
                    and_(DirectMessage.sender_id == current_user.id, DirectMessage.receiver_id == partner_id),
                    and_(DirectMessage.sender_id == partner_id, DirectMessage.receiver_id == current_user.id),
                )
            ).order_by(DirectMessage.created_at.desc()).limit(1)
        )).scalar_one_or_none()

        unread = (await db.execute(
            select(func.count()).where(
                DirectMessage.sender_id == partner_id,
                DirectMessage.receiver_id == current_user.id,
                DirectMessage.read_at == None,
            )
        )).scalar() or 0

        result.append(ConversationOut(
            user=await _build_public(partner, current_user, db),
            last_message=_msg_out(latest) if latest else None,
            unread_count=unread,
        ))

    result.sort(
        key=lambda c: c.last_message.created_at if c.last_message else datetime.min,
        reverse=True,
    )
    return result


@router.get("/{user_id}", response_model=list[DirectMessageOut])
async def get_messages(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    msgs = (await db.execute(
        select(DirectMessage).where(
            or_(
                and_(DirectMessage.sender_id == current_user.id, DirectMessage.receiver_id == user_id),
                and_(DirectMessage.sender_id == user_id, DirectMessage.receiver_id == current_user.id),
            )
        ).order_by(DirectMessage.created_at.asc())
    )).scalars().all()

    now = datetime.utcnow()
    changed = False
    for m in msgs:
        if m.receiver_id == current_user.id and m.read_at is None:
            m.read_at = now
            changed = True
    if changed:
        await db.commit()

    return [_msg_out(m) for m in msgs]


@router.post("/{user_id}", response_model=DirectMessageOut, status_code=status.HTTP_201_CREATED)
async def send_message(
    user_id: UUID,
    data: DirectMessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not data.content.strip():
        raise HTTPException(status_code=400, detail="메시지를 입력해 주세요")
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="자신에게 메시지를 보낼 수 없습니다")

    target = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not target or not target.is_active:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

    msg = DirectMessage(
        sender_id=current_user.id,
        receiver_id=user_id,
        content=data.content.strip(),
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return _msg_out(msg)
