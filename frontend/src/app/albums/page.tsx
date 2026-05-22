"use client";
import { useEffect, useState } from "react";
import { api, Album } from "@/lib/api";
import { AlbumCard } from "@/components/AlbumCard";

export default function AlbumsPage() {
  const [albums, setAlbums] = useState<Album[]>([]);

  useEffect(() => {
    api.getAlbums(0, 100).then(setAlbums).catch(() => {});
  }, []);

  return (
    <div className="p-6 md:p-10">
      <h1 className="text-2xl font-bold mb-6">모든 앨범</h1>
      {albums.length === 0 ? (
        <div className="flex items-center justify-center h-32 rounded-xl bg-bg-panel border border-border">
          <p className="text-muted text-sm">아직 업로드된 앨범이 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {albums.map((album) => <AlbumCard key={album.id} album={album} />)}
        </div>
      )}
    </div>
  );
}
