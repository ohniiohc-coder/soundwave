"use client";
import { useState } from "react";
import { Play, Pause, Trash2 } from "lucide-react";
import { usePlayerStore, PlayerTrack } from "@/store/playerStore";
import { useAuthStore } from "@/store/authStore";
import { AddToPlaylistButton } from "@/components/AddToPlaylistButton";
import clsx from "clsx";

function formatDuration(secs: number | null): string {
  if (!secs) return "--:--";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type Props = {
  tracks: PlayerTrack[];
  showAlbum?: boolean;
  showNumber?: boolean;
  onDeleteTrack?: (trackId: string) => void;
  onPlayTrack?: (index: number) => void;
};

export function TrackList({
  tracks,
  showAlbum = false,
  showNumber = true,
  onDeleteTrack,
  onPlayTrack,
}: Props) {
  const { play, pause, isPlaying, currentTrack, addToQueue } = usePlayerStore();
  const { user } = useAuthStore();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const current = currentTrack();

  const canDelete = user?.role === "admin" && !!onDeleteTrack;

  const handlePlay = (index: number) => {
    if (onPlayTrack) { onPlayTrack(index); return; }
    const t = tracks[index];
    if (current?.id === t.id) {
      if (isPlaying) pause();
      else play();
    } else {
      addToQueue([t], 0);
    }
  };

  const handleDelete = async (e: React.MouseEvent, trackId: string) => {
    e.stopPropagation();
    if (!canDelete) return;
    if (!window.confirm("이 트랙을 삭제할까요?")) return;
    setDeletingId(trackId);
    try {
      const { api } = await import("@/lib/api");
      await api.deleteTrack(trackId);
      onDeleteTrack?.(trackId);
    } catch {
      alert("삭제 실패");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      {tracks.map((track, i) => {
        const isActive = current?.id === track.id;
        const isDeleting = deletingId === track.id;
        return (
          <div
            key={track.id}
            className={clsx(
              "group flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] cursor-pointer transition-colors",
              isActive ? "bg-[rgba(200,255,0,0.05)]" : "hover:bg-white/[0.04]",
              isDeleting && "opacity-40 pointer-events-none"
            )}
            onClick={() => handlePlay(i)}
          >
            {/* 번호 / 재생 버튼 */}
            <div className="w-7 text-center flex-shrink-0">
              <span className={clsx("text-[12px] group-hover:hidden", isActive ? "text-accent" : "text-muted/60")}>
                {showNumber ? (track.track_number ?? i + 1) : ""}
              </span>
              <button className="hidden group-hover:flex items-center justify-center w-full">
                {isActive && isPlaying ? (
                  <Pause size={13} style={{ color: "rgba(255,255,255,0.8)" }} />
                ) : (
                  <Play size={13} style={{ color: "rgba(255,255,255,0.8)" }} />
                )}
              </button>
            </div>

            {/* 제목/아티스트 */}
            <div className="flex-1 min-w-0">
              <p
                className="text-[13px] truncate"
                style={{ color: isActive ? "#c8ff00" : "rgba(255,255,255,0.9)" }}
              >
                {track.title}
              </p>
              {track.artistName && (
                <p className="text-[11px] truncate" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {track.artistName}
                </p>
              )}
            </div>

            {/* 앨범 */}
            {showAlbum && track.albumTitle && (
              <p className="hidden md:block text-[11px] truncate w-40" style={{ color: "rgba(255,255,255,0.2)" }}>
                {track.albumTitle}
              </p>
            )}

            {/* 재생시간 + 버튼들 */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-[11px] tabular-nums mr-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                {formatDuration(track.duration_seconds)}
              </span>
              <AddToPlaylistButton trackId={track.id} />
              {canDelete && (
                <button
                  onClick={(e) => handleDelete(e, track.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-500/20 text-muted hover:text-red-400"
                  title="트랙 삭제"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
