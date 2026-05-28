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
      window.location.href = `/album/${album.id}`;
    } finally {
      setLoading(false);
    }
  };

  return (
    <Link href={`/album/${album.id}`} className="group block cursor-pointer">
      {/* 커버 */}
      <div className="relative aspect-square rounded-[10px] overflow-hidden bg-bg-elevated mb-2.5">
        {album.cover_art_url ? (
          <Image
            src={album.cover_art_url}
            alt={album.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.05]"
            sizes="(max-width: 768px) 50vw, 200px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center transition-transform duration-300 group-hover:scale-[1.05]">
            <Music2 size={40} style={{ color: "rgba(255,255,255,0.06)" }} />
          </div>
        )}
        {/* 호버 오버레이 */}
        <div className="absolute inset-0 bg-black/45 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={handlePlay}
            className="w-11 h-11 rounded-full bg-accent flex items-center justify-center scale-75 group-hover:scale-100 transition-transform duration-200"
            style={{ boxShadow: "0 4px 20px rgba(200,255,0,0.3)" }}
          >
            {loading
              ? <Loader2 size={16} className="text-black animate-spin" />
              : <Play size={16} fill="black" className="text-black ml-0.5" />
            }
          </button>
        </div>
      </div>
      <p className="text-[13px] font-medium truncate mb-0.5" style={{ color: "rgba(255,255,255,0.9)" }}>
        {album.title}
      </p>
      <p className="text-[11px] truncate" style={{ color: "rgba(255,255,255,0.35)" }}>
        {album.release_year ?? "연도 미상"}
        {album.genre ? ` · ${album.genre}` : ""}
      </p>
    </Link>
  );
}
