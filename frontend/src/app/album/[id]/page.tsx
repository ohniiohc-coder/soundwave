"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { api, AlbumDetail, Track } from "@/lib/api";
import { TrackList } from "@/components/TrackList";
import { PlayerTrack, usePlayerStore } from "@/store/playerStore";
import Link from "next/link";
import { Play, Pencil, Check, X, Music2, Trash2 } from "lucide-react";

export default function AlbumPage() {
  const { id } = useParams<{ id: string }>();
  const [album, setAlbum] = useState<AlbumDetail | null>(null);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ title: "", release_year: "", genre: "", description: "" });
  const [apiKey, setApiKey] = useState("");
  const { playContext, activeContextId, contextType } = usePlayerStore();

  useEffect(() => {
    api.getAlbum(id).then(setAlbum).catch(console.error);
  }, [id]);

  useEffect(() => {
    if (album) {
      setForm({
        title: album.title,
        release_year: album.release_year?.toString() ?? "",
        genre: album.genre ?? "",
        description: album.description ?? "",
      });
    }
  }, [album]);

  const toPlayerTracks = (tracks: Track[]): PlayerTrack[] =>
    tracks.map((t) => ({
      ...t,
      albumTitle: album?.title,
      artistName: album?.artist?.name,
      coverUrl: album?.cover_art_url ?? undefined,
    }));

  const handlePlayAll = () => {
    if (album?.tracks.length) playContext("album", album.id, toPlayerTracks(album.tracks), 0);
  };

  const handleSave = async () => {
    if (!album) return;
    try {
      const updated = await api.updateAlbum(album.id, {
        title: form.title,
        release_year: form.release_year ? parseInt(form.release_year) : undefined,
        genre: form.genre || undefined,
        description: form.description || undefined,
      });
      setAlbum((prev) => prev ? { ...prev, ...updated } : null);
      setEditing(false);
    } catch (e) {
      alert("저장 실패: API 키를 확인하세요");
    }
  };

  const handleDeleteAlbum = async () => {
    if (!album || !apiKey) return;
    const trackCount = album.tracks.length;
    const msg = trackCount > 0
      ? `앨범 "${album.title}"과 포함된 ${trackCount}곡을 모두 삭제합니다. 계속할까요?`
      : `앨범 "${album.title}"을 삭제합니다. 계속할까요?`;
    if (!window.confirm(msg)) return;
    setDeleting(true);
    try {
      await api.deleteAlbum(album.id, apiKey);
      window.location.href = "/albums";
    } catch {
      alert("삭제 실패: API 키를 확인하세요.");
      setDeleting(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !album) return;
    if (!apiKey) {
      alert("먼저 Admin API Key를 입력하세요.");
      e.target.value = "";
      return;
    }
    try {
      const updated = await api.uploadAlbumCover(album.id, file, apiKey);
      setAlbum((prev) => prev ? { ...prev, cover_art_url: updated.cover_art_url } : null);
    } catch {
      alert("커버 업로드 실패: API 키를 확인하세요.");
    }
    e.target.value = "";
  };

  if (!album) {
    return <div className="flex items-center justify-center h-64 text-muted">로딩 중...</div>;
  }

  const totalDuration = album.tracks.reduce((s, t) => s + (t.duration_seconds ?? 0), 0);
  const durationStr = totalDuration > 0
    ? `${Math.floor(totalDuration / 60)}분 ${totalDuration % 60}초`
    : "";

  return (
    <div className="min-h-full">
      {/* 앨범 헤더 */}
      <div className="relative p-8 md:p-10">
        <div
          className="absolute inset-0 opacity-20 blur-3xl -z-0"
          style={{ background: "radial-gradient(circle at 30% 50%, #c9a96e 0%, transparent 70%)" }}
        />
        <div className="relative flex gap-8 items-end">
          {/* 커버 이미지 */}
          <div className="relative w-44 h-44 rounded-xl overflow-hidden bg-bg-elevated shadow-2xl flex-shrink-0 group">
            {album.cover_art_url ? (
              <Image src={album.cover_art_url} alt={album.title} fill className="object-cover" sizes="176px" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music2 size={48} className="text-muted" />
              </div>
            )}
            {/* 커버 교체 버튼 */}
            <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <span className="text-xs text-white">커버 변경</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
            </label>
          </div>

          {/* 앨범 정보 */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted uppercase tracking-widest mb-2">앨범</p>
            {editing ? (
              <div className="space-y-2">
                <input
                  className="bg-bg-elevated border border-border rounded px-3 py-1.5 text-sm w-full"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
                <div className="flex gap-2">
                  <input
                    placeholder="발매년도"
                    className="bg-bg-elevated border border-border rounded px-3 py-1.5 text-sm w-32"
                    value={form.release_year}
                    onChange={(e) => setForm((f) => ({ ...f, release_year: e.target.value }))}
                  />
                  <input
                    placeholder="장르"
                    className="bg-bg-elevated border border-border rounded px-3 py-1.5 text-sm w-40"
                    value={form.genre}
                    onChange={(e) => setForm((f) => ({ ...f, genre: e.target.value }))}
                  />
                </div>
                <textarea
                  placeholder="설명"
                  className="bg-bg-elevated border border-border rounded px-3 py-1.5 text-sm w-full resize-none"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
                <div className="flex gap-2 items-center">
                  <button onClick={handleSave} className="p-1.5 rounded bg-accent text-black hover:bg-accent-light">
                    <Check size={14} />
                  </button>
                  <button onClick={() => setEditing(false)} className="p-1.5 rounded bg-bg-elevated hover:bg-bg-hover">
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-3xl md:text-4xl font-bold mb-2 leading-tight">{album.title}</h1>
                <div className="flex items-center gap-3 text-sm text-muted flex-wrap">
                  {album.artist && (
                    <Link
                      href={`/artist/${album.artist.id}`}
                      className="text-white font-medium hover:text-accent transition-colors"
                    >
                      {album.artist.name}
                    </Link>
                  )}
                  {album.release_year && <span>· {album.release_year}</span>}
                  {album.genre && <span>· {album.genre}</span>}
                  <span>· {album.tracks.length}곡</span>
                  {durationStr && <span>· {durationStr}</span>}
                </div>
                {album.description && (
                  <p className="mt-2 text-sm text-muted line-clamp-2">{album.description}</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="relative flex items-center gap-4 mt-6 flex-wrap">
          <button
            onClick={handlePlayAll}
            className="flex items-center gap-2 px-6 py-2.5 bg-accent rounded-full text-black font-semibold text-sm hover:bg-accent-light transition-colors"
          >
            <Play size={16} fill="black" />
            전체 재생
          </button>
          <button
            onClick={() => setEditing(true)}
            className="p-2.5 rounded-full bg-bg-elevated hover:bg-bg-hover transition-colors text-muted hover:text-white"
          >
            <Pencil size={16} />
          </button>
          {/* 어드민 키 — 편집·삭제 공용 */}
          <input
            type="password"
            placeholder="Admin API Key (편집·삭제용)"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="bg-bg-elevated border border-border rounded-full px-4 py-2 text-xs outline-none focus:border-accent transition-colors w-52"
          />
          <button
            onClick={handleDeleteAlbum}
            disabled={!apiKey || deleting}
            className="p-2.5 rounded-full bg-bg-elevated hover:bg-red-500/20 transition-colors text-muted hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
            title="앨범 삭제"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* 트랙 목록 */}
      <div className="px-4 md:px-6 pb-10">
        {album.tracks.length === 0 ? (
          <p className="text-muted text-sm py-8 text-center">이 앨범에 트랙이 없습니다.</p>
        ) : (
          <TrackList
            tracks={toPlayerTracks(album.tracks)}
            adminApiKey={apiKey}
            onDeleteTrack={(trackId) =>
              setAlbum((prev) =>
                prev ? { ...prev, tracks: prev.tracks.filter((t) => t.id !== trackId) } : null
              )
            }
          />
        )}
      </div>
    </div>
  );
}
