"use client";
import { useEffect, useState } from "react";
import { api, Album, Artist } from "@/lib/api";
import { AlbumCard } from "@/components/AlbumCard";
import { ArtistCard } from "@/components/ArtistCard";
import { NowPlayingOrbs } from "@/components/NowPlayingOrbs";

export default function HomePage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);

  useEffect(() => {
    api.getAlbums(0, 12).then(setAlbums).catch(() => {});
    api.getArtists(0, 8).then(setArtists).catch(() => {});
  }, []);

  return (
    <div className="p-8 md:p-10">
      <NowPlayingOrbs />

      {/* 최신 앨범 */}
      <section className="mb-12">
        <p className="text-[10px] tracking-[0.18em] uppercase mb-5" style={{ color: "rgba(255,255,255,0.3)" }}>
          최신 앨범
        </p>
        {albums.length === 0 ? (
          <EmptyState message="아직 업로드된 앨범이 없습니다." />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
            {albums.map((album) => <AlbumCard key={album.id} album={album} />)}
          </div>
        )}
      </section>

      {/* 아티스트 */}
      <section>
        <p className="text-[10px] tracking-[0.18em] uppercase mb-5" style={{ color: "rgba(255,255,255,0.3)" }}>
          아티스트
        </p>
        {artists.length === 0 ? (
          <EmptyState message="아직 등록된 아티스트가 없습니다." />
        ) : (
          <div className="flex flex-wrap gap-1">
            {artists.map((artist) => <ArtistCard key={artist.id} artist={artist} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-32 rounded-xl border border-border" style={{ background: "rgba(255,255,255,0.02)" }}>
      <p className="text-muted text-sm">{message}</p>
    </div>
  );
}
