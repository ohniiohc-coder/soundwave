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
    <div className="divide-y divide-border">
      {tracks.map((track, i) => {
        const isActive = current?.id === track.id;
        const isDeleting = deletingId === track.id;
        return (
          <div
            key={track.id}
            className={clsx(
              "group flex items-center gap-4 px-4 py-3 hover:bg-bg-elevated transition-colors cursor-pointer",
              isActive && "bg-bg-elevated",
              isDeleting && "opacity-40 pointer-events-none"
            )}
            onClick={() => handlePlay(i)}
          >
            {/* 번호 / 재생 버튼 */}
            <div className="w-6 text-center flex-shrink-0">
              <span className={clsx("text-sm group-hover:hidden", isActive ? "text-accent" : "text-muted")}>
                {showNumber ? (track.track_number ?? i + 1) : ""}
              </span>
              <button className="hidden group-hover:flex items-center justify-center">
                {isActive && isPlaying ? (
                  <Pause size={14} className="text-white" />
                ) : (
                  <Play size={14} className="text-white" />
                )}
              </button>
            </div>

            {/* 제목/아티스트 */}
            <div className="flex-1 min-w-0">
              <p className={clsx("text-sm font-medium truncate", isActive && "text-accent")}>
                {track.title}
              </p>
              {track.artistName && (
                <p className="text-xs text-muted truncate">{track.artistName}</p>
              )}
            </div>

            {/* 앨범 */}
            {showAlbum && track.albumTitle && (
              <p className="hidden md:block text-xs text-muted truncate w-40">{track.albumTitle}</p>
            )}

            {/* 재생시간 + 버튼들 */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-xs text-muted mr-1">{formatDuration(track.duration_seconds)}</span>
              <AddToPlaylistButton trackId={track.id} />
              {canDelete && (
                <button
                  onClick={(e) => handleDelete(e, track.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-500/20 text-muted hover:text-red-400"
                  title="트랙 삭제"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
