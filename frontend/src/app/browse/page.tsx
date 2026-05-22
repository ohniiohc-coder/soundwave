"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import { api, SearchResult } from "@/lib/api";
import { AlbumCard } from "@/components/AlbumCard";
import { ArtistCard } from "@/components/ArtistCard";
import { TrackList } from "@/components/TrackList";
import { usePlayerStore } from "@/store/playerStore";

export default function BrowsePage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (!q.trim()) { setResult(null); return; }
    setLoading(true);
    try {
      const r = await api.search(q);
      setResult(r);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const trackItems = (result?.tracks ?? []).map((t) => ({
    ...t,
    albumTitle: undefined,
    artistName: undefined,
    coverUrl: undefined,
  }));

  return (
    <div className="p-6 md:p-10 space-y-8">
      <h1 className="text-2xl font-bold">탐색</h1>

      {/* 검색창 */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="text"
          placeholder="트랙, 앨범, 아티스트 검색..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full max-w-lg bg-bg-panel border border-border rounded-full pl-11 pr-5 py-3 text-sm outline-none focus:border-accent transition-colors"
        />
      </div>

      {loading && <p className="text-muted text-sm">검색 중...</p>}

      {result && (
        <div className="space-y-8">
          {result.tracks.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3">트랙</h2>
              <div className="bg-bg-panel rounded-xl overflow-hidden">
                <TrackList tracks={trackItems} showNumber={false} />
              </div>
            </section>
          )}
          {result.albums.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3">앨범</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {result.albums.map((a) => <AlbumCard key={a.id} album={a} />)}
              </div>
            </section>
          )}
          {result.artists.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3">아티스트</h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {result.artists.map((a) => <ArtistCard key={a.id} artist={a} />)}
              </div>
            </section>
          )}
          {result.tracks.length === 0 && result.albums.length === 0 && result.artists.length === 0 && (
            <p className="text-muted text-sm">검색 결과가 없습니다.</p>
          )}
        </div>
      )}
    </div>
  );
}
