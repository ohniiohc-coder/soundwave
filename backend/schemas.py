from pydantic import BaseModel, ConfigDict
from datetime import datetime
from uuid import UUID


# ─── Artist ───────────────────────────────────────────────────────────────────

class ArtistBase(BaseModel):
    name: str
    image_url: str | None = None


class ArtistCreate(ArtistBase):
    pass


class ArtistUpdate(BaseModel):
    name: str | None = None
    image_url: str | None = None


class ArtistOut(ArtistBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    created_at: datetime
    updated_at: datetime


class ArtistDetail(ArtistOut):
    albums: list["AlbumOut"] = []


# ─── Album ────────────────────────────────────────────────────────────────────

class AlbumBase(BaseModel):
    title: str
    release_year: int | None = None
    genre: str | None = None
    description: str | None = None


class AlbumCreate(AlbumBase):
    artist_id: UUID | None = None


class AlbumUpdate(BaseModel):
    title: str | None = None
    release_year: int | None = None
    genre: str | None = None
    description: str | None = None
    artist_id: UUID | None = None


class AlbumOut(AlbumBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    artist_id: UUID | None
    cover_art_key: str | None
    cover_art_url: str | None = None  # computed field
    created_at: datetime
    updated_at: datetime


class AlbumDetail(AlbumOut):
    artist: ArtistOut | None = None
    tracks: list["TrackOut"] = []


# ─── Track ────────────────────────────────────────────────────────────────────

class TrackBase(BaseModel):
    title: str
    track_number: int | None = None
    disc_number: int | None = 1


class TrackUpdate(BaseModel):
    title: str | None = None
    track_number: int | None = None
    disc_number: int | None = None
    album_id: UUID | None = None
    artist_id: UUID | None = None


class TrackOut(TrackBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    album_id: UUID | None
    artist_id: UUID | None
    duration_seconds: int | None
    file_key: str
    file_size: int | None
    format: str | None
    bitrate: int | None
    stream_url: str | None = None  # computed field
    created_at: datetime
    updated_at: datetime


class TrackDetail(TrackOut):
    album: AlbumOut | None = None
    artist: ArtistOut | None = None


# ─── Upload ───────────────────────────────────────────────────────────────────

class UploadResponse(BaseModel):
    track_id: UUID
    message: str
    dag_run_id: str | None = None


# ─── Search ───────────────────────────────────────────────────────────────────

class SearchResult(BaseModel):
    tracks: list[TrackOut] = []
    albums: list[AlbumOut] = []
    artists: list[ArtistOut] = []



# ─── Playlist ─────────────────────────────────────────────────────────────────

class PlaylistTrackOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    track_id: UUID
    position: int
    added_at: datetime
    cover_art_url: str | None = None
    artist_name: str | None = None
    album_title: str | None = None
    track: TrackOut


class PlaylistOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str
    track_count: int = 0
    created_at: datetime
    updated_at: datetime


class PlaylistDetail(PlaylistOut):
    items: list[PlaylistTrackOut] = []


class PlaylistCreate(BaseModel):
    name: str


class PlaylistUpdate(BaseModel):
    name: str


class PlaylistAddTrack(BaseModel):
    track_id: UUID


# ─── Auth / User ──────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    display_name: str
    username: str
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    display_name: str
    username: str
    role: str
    created_at: datetime


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# resolve forward refs
ArtistDetail.model_rebuild()
AlbumDetail.model_rebuild()
