"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { api, AlbumDetail, Track } from "@/lib/api";
import { TrackList } from "@/components/TrackList";
import { PlayerTrack, usePlayerStore } from "@/store/playerStore";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import { Play, Pencil, Check, X, Music2, Trash2 } from "lucide-react";

export default function AlbumPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";
  const [album, setAlbum] = useState<AlbumDetail | null>(null);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ title: "", release_year: "", genre: "", description: "" });
  const { playContext } = usePlayerStore();

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
    } catch {
      alert("저장 실패");
    }
  };

  const handleDeleteAlbum = async () => {
    if (!album) return;
    const msg = album.tracks.length > 0
      ? `앨범 "${album.title}"과 포함된 ${album.tracks.length}곡을 모두 삭제합니다. 계속할까요?`
      : `앨범 "${album.title}"을 삭제합니다. 계속할까요?`;
    if (!window.confirm(msg)) return;
    setDeleting(true);
    try {
      await api.deleteAlbum(album.id);
      window.location.href = "/albums";
    } catch {
      alert("삭제 실패");
      setDeleting(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !album) return;
    try {
      const updated = await api.uploadAlbumCover(album.id, file);
      setAlbum((prev) => prev ? { ...prev, cover_art_url: updated.cover_art_url } : null);
    } catch {
      alert("커버 업로드 실패");
    }
    e.target.value = "";
  };

  if (!album) {
    return <div className="flex items-center justify-center h-64 text-muted">로딩 중...</div>;
  }

  const totalDuration = album.tracks.reduce((s, t) => s + (t.duration_seconds ?? 0), 0);
  const durationMin = totalDuration > 0 ? `${Math.floor(totalDuration / 60)}분` : "";

  return (
    <div className="p-8 md:p-10 min-h-full">
      {/* ── 앨범 헤더 (260px, blurred bg) ── */}
      <div
        className="relative overflow-hidden mb-7"
        style={{ height: "260px", borderRadius: "18px" }}
      >
        {/* 블러 배경 */}
        {album.cover_art_url ? (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${album.cover_art_url})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(24px) brightness(0.35)",
              transform: "scale(1.1)",
            }}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(135deg, #0f0c29 0%, #302b63 100%)" }}
          />
        )}

        {/* 그라디언트 오버레이 */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to top, rgba(10,10,10,0.95) 0%, transparent 60%)" }}
        />

        {/* 콘텐츠 (하단 정렬) */}
        <div className="absolute inset-0 z-10 flex items-end gap-6 p-7">
          {/* 앨범 아트 */}
          <div className="relative w-32 h-32 rounded-[10px] overflow-hidden bg-bg-elevated flex-shrink-0 group" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
            {album.cover_art_url ? (
              <Image src={album.cover_art_url} alt={album.title} fill className="object-cover" sizes="128px" />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: "#1a1a1a" }}>
                <Music2 size={40} style={{ color: "rgba(255,255,255,0.08)" }} />
              </div>
            )}
            {isAdmin && (
              <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <span className="text-xs text-white">커버 변경</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
              </label>
            )}
          </div>

          {/* 앨범 정보 */}
          <div className="flex-1 min-w-0">
            <p
              className="mb-1.5"
              style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}
            >
              앨범{album.release_year ? ` · ${album.release_year}` : ""}
            </p>

            {editing && isAdmin ? (
              <div className="space-y-2">
                <input
                  className="bg-black/40 border border-border rounded px-3 py-1.5 text-sm w-full"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
                <div className="flex gap-2">
                  <input
                    placeholder="발매년도"
                    className="bg-black/40 border border-border rounded px-3 py-1.5 text-sm w-28"
                    value={form.release_year}
                    onChange={(e) => setForm((f) => ({ ...f, release_year: e.target.value }))}
                  />
                  <input
                    placeholder="장르"
                    className="bg-black/40 border border-border rounded px-3 py-1.5 text-sm w-36"
                    value={form.genre}
                    onChange={(e) => setForm((f) => ({ ...f, genre: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2 items-center">
                  <button onClick={handleSave} className="p-1.5 rounded bg-accent text-black hover:bg-accent-light">
                    <Check size={14} />
                  </button>
                  <button onClick={() => setEditing(false)} className="p-1.5 rounded bg-white/10 hover:bg-white/20">
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1
                  className="mb-1.5 leading-[1.1] truncate"
                  style={{
                    fontFamily: "var(--font-playfair, 'Playfair Display', Georgia, serif)",
                    fontSize: "clamp(24px, 3vw, 38px)",
                    color: "rgba(255,255,255,0.9)",
                  }}
                >
                  {album.title}
                </h1>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)" }}>
                  {album.artist && (
                    <Link
                      href={`/artist/${album.artist.id}`}
                      className="transition-colors"
                      style={{ color: "rgba(255,255,255,0.65)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.9)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.65)")}
                    >
                      {album.artist.name}
                    </Link>
                  )}
                  {album.genre ? ` · ${album.genre}` : ""}
                  {` · ${album.tracks.length}곡`}
                  {durationMin ? ` · ${durationMin}` : ""}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── 액션 버튼 ── */}
      <div className="flex items-center gap-3.5 mb-8">
        <button
          onClick={handlePlayAll}
          className="w-[52px] h-[52px] rounded-full flex items-center justify-center flex-shrink-0 transition-transform hover:scale-[1.06]"
          style={{ background: "#c8ff00", boxShadow: "0 4px 24px rgba(200,255,0,0.25)" }}
        >
          <Play size={20} fill="black" className="text-black ml-0.5" />
        </button>

        {isAdmin && (
          <>
            <button
              onClick={() => setEditing(true)}
              className="px-[18px] py-[7px] rounded-full text-xs transition-colors"
              style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.2)";
                (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.9)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
                (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.6)";
              }}
            >
              <Pencil size={13} className="inline mr-1.5 -mt-0.5" />
              편집
            </button>
            <button
              onClick={handleDeleteAlbum}
              disabled={deleting}
              className="px-[18px] py-[7px] rounded-full text-xs transition-colors disabled:opacity-30"
              style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(220,50,50,0.5)";
                (e.currentTarget as HTMLElement).style.color = "rgba(220,80,80,0.9)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
                (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.6)";
              }}
            >
              <Trash2 size={13} className="inline mr-1.5 -mt-0.5" />
              삭제
            </button>
          </>
        )}
      </div>

      {/* ── 트랙 목록 ── */}
      {album.tracks.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: "rgba(255,255,255,0.35)" }}>
          이 앨범에 트랙이 없습니다.
        </p>
      ) : (
        <>
          {/* 트랙 헤더 */}
          <div
            className="grid gap-3 px-3.5 pb-2 mb-1"
            style={{
              gridTemplateColumns: "28px 1fr 60px",
              fontSize: "10px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.2)",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <span className="text-center">#</span>
            <span>제목</span>
            <span className="text-right">시간</span>
          </div>
          <TrackList
            tracks={toPlayerTracks(album.tracks)}
            onDeleteTrack={isAdmin ? (trackId) =>
              setAlbum((prev) =>
                prev ? { ...prev, tracks: prev.tracks.filter((t) => t.id !== trackId) } : null
              ) : undefined}
          />
        </>
      )}
    </div>
  );
}
