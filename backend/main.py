from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from sqlalchemy import text
from database import init_db, engine
from routers import artists, albums, tracks, upload, search, queue, playlists, recent_contexts, auth, users, messages


async def migrate_users_table():
    async with engine.begin() as conn:
        await conn.execute(text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(100) NOT NULL DEFAULT ''"
        ))
        await conn.execute(text(
            "ALTER TABLE users DROP COLUMN IF EXISTS email"
        ))


async def migrate_user_bio():
    async with engine.begin() as conn:
        await conn.execute(text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT"
        ))
        await conn.execute(text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT FALSE"
        ))
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS follows (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                UNIQUE (follower_id, following_id)
            )
        """))
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS follow_requests (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                target_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                UNIQUE (requester_id, target_id)
            )
        """))
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS direct_messages (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                read_at TIMESTAMP
            )
        """))


async def migrate_user_scoped_data():
    async with engine.begin() as conn:
        # playlists에 user_id 컬럼 추가
        await conn.execute(text(
            "ALTER TABLE playlists ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE"
        ))
        # recent_contexts에 user_id 컬럼 추가
        await conn.execute(text(
            "ALTER TABLE recent_contexts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE"
        ))
        # recent_contexts unique constraint를 (context_id, user_id) 복합키로 변경
        await conn.execute(text(
            "ALTER TABLE recent_contexts DROP CONSTRAINT IF EXISTS recent_contexts_pkey"
        ))
        await conn.execute(text(
            "ALTER TABLE recent_contexts ADD COLUMN IF NOT EXISTS rc_id SERIAL"
        ))
        await conn.execute(text(
            "DO $$ BEGIN "
            "  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'recent_contexts_context_id_user_id_key') THEN "
            "    ALTER TABLE recent_contexts ADD CONSTRAINT recent_contexts_context_id_user_id_key UNIQUE (context_id, user_id); "
            "  END IF; "
            "END $$"
        ))
        # 기존 데이터를 i_2000n 유저에 배정
        result = await conn.execute(text("SELECT id FROM users WHERE username = 'i_2000n'"))
        inho = result.fetchone()
        if inho:
            await conn.execute(
                text("UPDATE playlists SET user_id = :uid WHERE user_id IS NULL"),
                {"uid": str(inho[0])},
            )
            await conn.execute(
                text("UPDATE recent_contexts SET user_id = :uid WHERE user_id IS NULL"),
                {"uid": str(inho[0])},
            )


async def migrate_presence():
    async with engine.begin() as conn:
        await conn.execute(text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP"
        ))
        await conn.execute(text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS now_playing_track_id UUID REFERENCES tracks(id) ON DELETE SET NULL"
        ))


async def migrate_avatar():
    async with engine.begin() as conn:
        await conn.execute(text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_key VARCHAR(500)"
        ))


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await migrate_users_table()
    await migrate_user_bio()
    await migrate_user_scoped_data()
    await migrate_presence()
    await migrate_avatar()
    yield


app = FastAPI(title="Music Streaming API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(artists.router)
app.include_router(albums.router)
app.include_router(tracks.router)
app.include_router(upload.router)
app.include_router(search.router)
app.include_router(queue.router)
app.include_router(playlists.router)
app.include_router(recent_contexts.router)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(messages.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
