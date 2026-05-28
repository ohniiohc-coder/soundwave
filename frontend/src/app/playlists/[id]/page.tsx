"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { api, PlaylistDetail } from "@/lib/api";
import { usePlayerStore, PlayerTrack } from "@/store/playerStore";
import { useAuthStore } from "@/store/authStore";
import { Play, Pause, Trash2, ListMusic, Check, X, Music2, GripVertical } from "lucide-react";
import clsx from "clsx";

function fmt(secs: number | null) {
  if (!secs) return "--:--";
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
}

function toPlayerTrack(item: PlaylistDetail["items"][number]): PlayerTrack {
  return {
    ...item.track,
    albumTitle: item.album_title ?? undefined,
    artistName: item.artist_name ?? undefined,
    coverUrl: item.cover_art_url ?? undefined,
  };
}

export default function PlaylistPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const { playContext, addToQueue, currentTrack, isPlaying, play, pause } = usePlayerStore();
  const dragFrom = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  useEffect(() => {
    api.getPlaylist(id)
      .then((pl) => { setPlaylist(pl); setName(pl.name); })
      .catch(console.error);
  }, [id]);

  const handlePlayAll = () => {
    if (!playlist?.items.length) return;
    playContext("playlist", playlist.id, playlist.items.map(toPlayerTrack), 0);
  };

  const handleRename = async () => {
    if (!playlist || !name.trim()) return;
    try {
      const updated = await api.updatePlaylist(playlist.id, name.trim());
      setPlaylist((p) => p ? { ...p, name: updated.name } : null);
      setEditing(false);
    } catch { alert("이름 변경 실패"); }
  };

  const handleDelete = async () => {
    if (!playlist || !window.confirm(`"${playlist.name}" 플레이리스트를 삭제할까요?`)) return;
    await api.deletePlaylist(playlist.id);
    window.location.href = "/";
  };

  const handleRemoveTrack = async (trackId: string) => {
    if (!playlist) return;
    await api.removeTrackFromPlaylist(playlist.id, trackId);
    setPlaylist((p) => p ? {
      ...p,
      items: p.items.filter((i) => i.track_id !== trackId),
      track_count: p.track_count - 1,
    } : null);
  };

  const handleDragStart = (e: React.DragEvent, i: number) => {
    dragFrom.current = i;
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    setDragOver(i);
  };
  const handleDrop = (e: React.DragEvent, to: number) => {
    e.preventDefault();
    const from = dragFrom.current;
    if (from !== null && from !== to && playlist) {
      const items = [...playlist.items];
      const [moved] = items.splice(from, 1);
      items.splice(to, 0, moved);
      setPlaylist((p) => p ? { ...p, items } : null);
      // DB에 새 순서 저장
      api.reorderPlaylist(playlist.id, items.map((i) => i.track.id)).catch(() => {});
    }
    dragFrom.current = null;
    setDragOver(null);
  };

  if (!playlist) return (
    <div className="flex items-center justify-center h-64 text-muted">로딩 중...</div>
  );

  const totalSecs = playlist.items.reduce((s, i) => s + (i.track.duration_seconds ?? 0), 0);

  return (
    <div className="min-h-full">
      {/* 헤더 */}
      <div className="relative p-8 md:p-10">
        <div className="absolute inset-0 opacity-15 blur-3xl -z-0"
          style={{ background: "radial-gradient(circle at 30% 50%, #c9a96e 0%, transparent 70%)" }} />

        <div className="relative flex gap-8 items-end">
          <div className="w-44 h-44 rounded-xl bg-bg-elevated flex items-center justify-center flex-shrink-0 shadow-2xl">
            <ListMusic size={56} className="text-muted" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted uppercase tracking-widest mb-2">플레이리스트</p>
            {editing && user ? (
              <div className="flex items-center gap-2 mb-3">
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setEditing(false); }}
                  className="bg-bg-elevated border border-border rounded px-3 py-1.5 text-2xl font-bold w-full outline-none focus:border-accent"
                />
                <button onClick={handleRename} className="p-1.5 rounded bg-accent text-black flex-shrink-0"><Check size={16} /></button>
                <button onClick={() => setEditing(false)} className="p-1.5 rounded bg-bg-elevated hover:bg-bg-hover flex-shrink-0"><X size={16} /></button>
              </div>
            ) : (
              <h1
                className={clsx(
                  "text-3xl md:text-4xl font-bold mb-2 transition-colors",
                  user && "cursor-pointer hover:text-accent"
                )}
                onClick={() => user && setEditing(true)}
                title={user ? "클릭하여 이름 변경" : undefined}
              >
                {playlist.name}
              </h1>
            )}
            <p className="text-sm text-muted">
              {playlist.track_count}곡{totalSecs > 0 && ` · 약 ${Math.floor(totalSecs / 60)}분`}
            </p>
          </div>
        </div>

        <div className="relative flex items-center gap-4 mt-6">
          <button
            onClick={handlePlayAll}
            disabled={!playlist.items.length}
            className="flex items-center gap-2 px-6 py-2.5 bg-accent rounded-full text-black font-semibold text-sm hover:bg-accent-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Play size={16} fill="black" />전체 재생
          </button>
          {user && (
            <button
              onClick={handleDelete}
              className="p-2.5 rounded-full bg-bg-elevated hover:bg-red-500/20 transition-colors text-muted hover:text-red-400"
              title="플레이리스트 삭제"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* 트랙 목록 */}
      <div className="px-4 md:px-6 pb-10">
        {playlist.items.length === 0 ? (
          <p className="text-muted text-sm py-8 text-center">
            트랙 목록에서 <span className="text-accent">≡+</span> 버튼으로 추가하세요.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {playlist.items.map((item, i) => {
              const isActive = currentTrack()?.id === item.track.id;
              return (
                <div
                  key={item.id}
                  draggable={!!user}
                  onDragStart={(e) => user && handleDragStart(e, i)}
                  onDragOver={(e) => user && handleDragOver(e, i)}
                  onDrop={(e) => user && handleDrop(e, i)}
                  onDragEnd={() => { dragFrom.current = null; setDragOver(null); }}
                  className={clsx(
                    "group flex items-center gap-3 px-3 py-3 transition-colors select-none",
                    isActive ? "bg-bg-elevated" : "hover:bg-bg-elevated",
                    dragOver === i && "border-t-2 border-accent"
                  )}
                >
                  {user && <GripVertical size={14} className="text-muted opacity-0 group-hover:opacity-100 cursor-grab flex-shrink-0" />}

                  <div
                    className="relative w-10 h-10 rounded overflow-hidden bg-bg-elevated flex-shrink-0 cursor-pointer"
                    onClick={() => {
                      if (isActive) { isPlaying ? pause() : play(); }
                      else { addToQueue([toPlayerTrack(item)], 0); }
                    }}
                  >
                    {item.cover_art_url
                      ? <Image src={item.cover_art_url} alt="" fill className="object-cover" sizes="40px" />
                      : <div className="w-full h-full flex items-center justify-center"><Music2 size={14} className="text-muted" /></div>
                    }
                    {isActive && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        {isPlaying
                          ? <Pause size={12} fill="white" className="text-white" />
                          : <Play size={12} fill="white" className="text-white ml-0.5" />
                        }
                      </div>
                    )}
                  </div>

                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => {
                      if (isActive) { isPlaying ? pause() : play(); }
                      else { addToQueue([toPlayerTrack(item)], 0); }
                    }}
                  >
                    <p className={clsx("text-sm font-medium truncate", isActive && "text-accent")}>
                      {item.track.title}
                    </p>
                    <p className="text-xs text-muted truncate">{item.artist_name ?? ""}</p>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-xs text-muted">{fmt(item.track.duration_seconds)}</span>
                    {user && (
                      <button
                        onClick={() => handleRemoveTrack(item.track.id)}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 text-muted hover:text-red-400 transition-all"
                        title="목록에서 제거"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
