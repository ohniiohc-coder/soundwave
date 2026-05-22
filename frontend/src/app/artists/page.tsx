"use client";
import { useEffect, useState } from "react";
import { api, Artist } from "@/lib/api";
import { ArtistCard } from "@/components/ArtistCard";

export default function ArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([]);

  useEffect(() => {
    api.getArtists(0, 100).then(setArtists).catch(() => {});
  }, []);

  return (
    <div className="p-6 md:p-10">
      <h1 className="text-2xl font-bold mb-6">모든 아티스트</h1>
      {artists.length === 0 ? (
        <div className="flex items-center justify-center h-32 rounded-xl bg-bg-panel border border-border">
          <p className="text-muted text-sm">아직 등록된 아티스트가 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
          {artists.map((artist) => <ArtistCard key={artist.id} artist={artist} />)}
        </div>
      )}
    </div>
  );
}
