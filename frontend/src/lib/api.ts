// 서버 컴포넌트(SSR): Docker 내부 서비스명으로 접근
// 클라이언트 컴포넌트(브라우저): 호스트 노출 포트로 접근
const BASE =
  typeof window === "undefined"
    ? process.env.API_URL || "http://backend:8000"
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type Track = {
  id: string;
  title: string;
  album_id: string | null;
  artist_id: string | null;
  track_number: number | null;
  duration_seconds: number | null;
  file_key: string;
  format: string | null;
  bitrate: number | null;
  stream_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Album = {
  id: string;
  title: string;
  artist_id: string | null;
  release_year: number | null;
  genre: string | null;
  cover_art_key: string | null;
  cover_art_url: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type AlbumDetail = Album & {
  artist: Artist | null;
  tracks: Track[];
};

export type Artist = {
  id: string;
  name: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type ArtistDetail = Artist & {
  albums: Album[];
};

export type SearchResult = {
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
};


export type Playlist = {
  id: string;
  name: string;
  track_count: number;
  created_at: string;
  updated_at: string;
};

export type PlaylistTrackItem = {
  id: string;
  track_id: string;
  position: number;
  added_at: string;
  cover_art_url: string | null;
  artist_name: string | null;
  album_title: string | null;
  track: Track;
};

export type PlaylistDetail = Playlist & {
  items: PlaylistTrackItem[];
};


async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T;
  }
  return res.json();
}

export const api = {
  // Albums
  getAlbums: (skip = 0, limit = 50) =>
    apiFetch<Album[]>(`/api/albums?skip=${skip}&limit=${limit}`),
  getAlbum: (id: string) => apiFetch<AlbumDetail>(`/api/albums/${id}`),
  updateAlbum: (id: string, data: Partial<Album>) =>
    apiFetch<Album>(`/api/albums/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  uploadAlbumCover: (id: string, file: File, apiKey: string) => {
    const form = new FormData();
    form.append("file", file);
    return apiFetch<Album>(`/api/albums/${id}/cover`, {
      method: "POST",
      headers: { "x-api-key": apiKey },
      body: form,
    });
  },

  // Artists
  getArtists: (skip = 0, limit = 50) =>
    apiFetch<Artist[]>(`/api/artists?skip=${skip}&limit=${limit}`),
  getArtist: (id: string) => apiFetch<ArtistDetail>(`/api/artists/${id}`),
  updateArtist: (id: string, data: Partial<Artist>) =>
    apiFetch<Artist>(`/api/artists/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  deleteArtist: (id: string, apiKey: string) =>
    apiFetch<void>(`/api/artists/${id}`, {
      method: "DELETE",
      headers: { "x-api-key": apiKey },
    }),
  uploadArtistImage: (id: string, file: File, apiKey: string) => {
    const form = new FormData();
    form.append("file", file);
    return apiFetch<Artist>(`/api/artists/${id}/image`, {
      method: "POST",
      headers: { "x-api-key": apiKey },
      body: form,
    });
  },

  // Tracks
  getTracks: (skip = 0, limit = 50) =>
    apiFetch<Track[]>(`/api/tracks?skip=${skip}&limit=${limit}`),
  getTrack: (id: string) => apiFetch<Track>(`/api/tracks/${id}`),
  updateTrack: (id: string, data: Partial<Track>) =>
    apiFetch<Track>(`/api/tracks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  deleteTrack: (id: string, apiKey: string) =>
    apiFetch<void>(`/api/tracks/${id}`, {
      method: "DELETE",
      headers: { "x-api-key": apiKey },
    }),
  deleteAlbum: (id: string, apiKey: string) =>
    apiFetch<void>(`/api/albums/${id}`, {
      method: "DELETE",
      headers: { "x-api-key": apiKey },
    }),

  // Upload
  uploadMusic: (file: File, apiKey: string) => {
    const form = new FormData();
    form.append("file", file);
    return apiFetch<{ track_id: string; message: string }>("/api/upload", {
      method: "POST",
      headers: { "x-api-key": apiKey },
      body: form,
    });
  },

  // Search
  search: (q: string) => apiFetch<SearchResult>(`/api/search?q=${encodeURIComponent(q)}`),

  // Stream URL helper
  streamUrl: (trackId: string) => `${BASE}/api/tracks/${trackId}/stream`,

  // 플레이리스트
  getPlaylists: () => apiFetch<Playlist[]>("/api/playlists"),
  getPlaylist: (id: string) => apiFetch<PlaylistDetail>(`/api/playlists/${id}`),
  createPlaylist: (name: string) =>
    apiFetch<Playlist>("/api/playlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }),
  updatePlaylist: (id: string, name: string) =>
    apiFetch<Playlist>(`/api/playlists/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }),
  deletePlaylist: (id: string) =>
    apiFetch<void>(`/api/playlists/${id}`, { method: "DELETE" }),
  addTrackToPlaylist: (playlistId: string, trackId: string) =>
    apiFetch<Playlist>(`/api/playlists/${playlistId}/tracks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ track_id: trackId }),
    }),
  removeTrackFromPlaylist: (playlistId: string, trackId: string) =>
    apiFetch<void>(`/api/playlists/${playlistId}/tracks/${trackId}`, { method: "DELETE" }),
  reorderPlaylist: (playlistId: string, trackIds: string[]) =>
    apiFetch<void>(`/api/playlists/${playlistId}/tracks/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ track_ids: trackIds }),
    }),

  // 최근 재생 컨텍스트
  getRecentContexts: () => apiFetch<{ context_type: string; context_id: string; context_name: string }[]>("/api/recent-contexts"),
  upsertRecentContext: (contextType: string, contextId: string, contextName: string) =>
    apiFetch<void>("/api/recent-contexts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context_type: contextType, context_id: contextId, context_name: contextName }),
    }),

  // 재생 대기열 (0번째 플레이리스트)
  getQueue: () => apiFetch<PlaylistDetail>("/api/queue"),
  saveQueue: (trackIds: string[]) =>
    apiFetch<void>("/api/queue", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ track_ids: trackIds }),
    }),
};
