"use client";
import { useEffect, useState } from "react";
import { api, Album, Artist } from "@/lib/api";
import { AlbumCard } from "@/components/AlbumCard";
import { ArtistCard } from "@/components/ArtistCard";

export default function HomePage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);

  useEffect(() => {
    api.getAlbums(0, 12).then(setAlbums).catch(() => {});
    api.getArtists(0, 8).then(setArtists).catch(() => {});
  }, []);

  return (
    <div className="p-6 md:p-10 space-y-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="text-accent">Sound</span>wave
        </h1>
        <p className="text-muted mt-1 text-sm">당신만의 음악 공간</p>
      </div>

      <section>
        <h2 className="text-xl font-semibold mb-5">최신 앨범</h2>
        {albums.length === 0 ? (
          <EmptyState message="아직 업로드된 앨범이 없습니다." />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {albums.map((album) => <AlbumCard key={album.id} album={album} />)}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-5">아티스트</h2>
        {artists.length === 0 ? (
          <EmptyState message="아직 등록된 아티스트가 없습니다." />
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {artists.map((artist) => <ArtistCard key={artist.id} artist={artist} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-32 rounded-xl bg-bg-panel border border-border">
      <p className="text-muted text-sm">{message}</p>
    </div>
  );
}
