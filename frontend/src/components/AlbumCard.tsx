"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Music2, Play, Loader2 } from "lucide-react";
import { Album, api } from "@/lib/api";
import { usePlayerStore, PlayerTrack } from "@/store/playerStore";

type Props = { album: Album };

export function AlbumCard({ album }: Props) {
  const { playContext } = usePlayerStore();
  const [loading, setLoading] = useState(false);

  const handlePlay = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      const detail = await api.getAlbum(album.id);
      if (!detail.tracks.length) return;
      const tracks: PlayerTrack[] = detail.tracks.map((t) => ({
        ...t,
        albumTitle: detail.title,
        artistName: detail.artist?.name,
        coverUrl: detail.cover_art_url ?? undefined,
      }));
      playContext("album", detail.id, tracks, 0);
    } catch {
      // 실패 시 앨범 페이지로 이동
      window.location.href = `/album/${album.id}`;
    } finally {
      setLoading(false);
    }
  };

  return (
    <Link
      href={`/album/${album.id}`}
      className="group flex flex-col gap-3 p-3 rounded-xl bg-bg-panel hover:bg-bg-elevated transition-colors cursor-pointer"
    >
      <div className="relative aspect-square rounded-lg overflow-hidden bg-bg-elevated">
        {album.cover_art_url ? (
          <Image
            src={album.cover_art_url}
            alt={album.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 200px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music2 size={40} className="text-muted" />
          </div>
        )}
        <div className="absolute inset-0 flex items-end justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handlePlay}
            className="w-10 h-10 rounded-full bg-accent shadow-lg flex items-center justify-center translate-y-2 group-hover:translate-y-0 transition-transform hover:bg-accent-light"
          >
            {loading
              ? <Loader2 size={16} className="text-black animate-spin" />
              : <Play size={16} fill="black" className="text-black ml-0.5" />
            }
          </button>
        </div>
      </div>
      <div>
        <p className="text-sm font-medium line-clamp-1">{album.title}</p>
        <p className="text-xs text-muted mt-0.5 line-clamp-1">
          {album.release_year ?? "연도 미상"}
          {album.genre ? ` · ${album.genre}` : ""}
        </p>
      </div>
    </Link>
  );
}
