from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from sqlalchemy import select
from database import init_db, AsyncSessionLocal
from models import Playlist
from routers import artists, albums, tracks, upload, search, queue, playlists, recent_contexts


async def ensure_default_queue():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Playlist).where(Playlist.is_default == True))
        if not result.scalar_one_or_none():
            db.add(Playlist(name="재생 대기열", is_default=True))
            await db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await ensure_default_queue()
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


@app.get("/health")
async def health():
    return {"status": "ok"}
