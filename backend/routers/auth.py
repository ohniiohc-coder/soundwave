from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from database import get_db
from models import User
from schemas import UserCreate, UserLogin, UserOut, UserUpdate, TokenOut
from utils.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/check-username")
async def check_username(username: str, db: AsyncSession = Depends(get_db)):
    dup = (await db.execute(select(User).where(User.username == username))).scalar_one_or_none()
    return {"available": dup is None}


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    if not data.display_name.strip():
        raise HTTPException(status_code=400, detail="이름을 입력해 주세요")
    if len(data.username) < 2 or len(data.username) > 30:
        raise HTTPException(status_code=400, detail="사용자 이름은 2~30자여야 합니다")
    if len(data.password) < 8:
        raise HTTPException(status_code=400, detail="비밀번호는 8자 이상이어야 합니다")

    dup = await db.execute(select(User).where(User.username == data.username))
    if dup.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="이미 사용 중인 사용자 이름입니다")

    user = User(
        display_name=data.display_name.strip(),
        username=data.username,
        password_hash=hash_password(data.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(str(user.id), user.role)
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenOut)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == data.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="사용자 이름 또는 비밀번호가 올바르지 않습니다")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="비활성화된 계정입니다")

    token = create_access_token(str(user.id), user.role)
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserOut)
async def update_me(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.display_name is not None:
        stripped = data.display_name.strip()
        if stripped:
            current_user.display_name = stripped
    if data.bio is not None:
        current_user.bio = data.bio or None
    if data.is_private is not None:
        current_user.is_private = data.is_private
    await db.commit()
    await db.refresh(current_user)
    return current_user
