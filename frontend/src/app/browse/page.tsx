"use client";
import { useState } from "react";
import { Search, Music2 } from "lucide-react";
import { api, SearchResult } from "@/lib/api";
import { AlbumCard } from "@/components/AlbumCard";
import { ArtistCard } from "@/components/ArtistCard";
import { usePlayerStore } from "@/store/playerStore";

type Tab = "all" | "tracks" | "albums" | "artists";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "tracks", label: "트랙" },
  { key: "albums", label: "앨범" },
  { key: "artists", label: "아티스트" },
];

function fmtDuration(secs: number | null) {
  if (!secs) return "";
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
}

export default function BrowsePage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("all");
  const { addToQueue } = usePlayerStore();

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (!q.trim()) { setResult(null); return; }
    setLoading(true);
    try {
      setResult(await api.search(q));
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const hasResults = result &&
    (result.tracks.length > 0 || result.albums.length > 0 || result.artists.length > 0);

  return (
    <div className="p-8 md:p-10">
      {/* 헤더 */}
      <h1
        className="mb-7 leading-[1]"
        style={{
          fontFamily: "var(--font-playfair, 'Playfair Display', Georgia, serif)",
          fontSize: "42px",
          letterSpacing: "-0.02em",
          color: "rgba(255,255,255,0.88)",
        }}
      >
        탐색
      </h1>

      {/* 검색창 */}
      <div className="relative mb-7 max-w-2xl">
        <Search size={16} className="absolute left-[18px] top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "rgba(255,255,255,0.3)" }} />
        <input
          type="text"
          placeholder="아티스트, 트랙, 앨범..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full border border-border rounded-2xl outline-none transition-colors"
          style={{
            background: "#1a1a1a",
            padding: "15px 18px 15px 46px",
            fontSize: "15px",
            color: "rgba(255,255,255,0.9)",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "")}
        />
      </div>

      {loading && (
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>검색 중...</p>
      )}

      {/* 필터 탭 */}
      {result && (
        <div className="flex gap-1 mb-8">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-4 py-1.5 rounded-full text-[12px] font-medium transition-all"
              style={{
                background: tab === t.key ? "rgba(255,255,255,0.9)" : "transparent",
                color: tab === t.key ? "#000" : "rgba(255,255,255,0.35)",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* 결과 없음 */}
      {result && !hasResults && !loading && (
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>검색 결과가 없습니다.</p>
      )}

      {result && hasResults && (
        <div className="space-y-10">
          {/* 트랙 */}
          {(tab === "all" || tab === "tracks") && result.tracks.length > 0 && (
            <section>
              <p className="text-[10px] tracking-[0.18em] uppercase mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>
                트랙
              </p>
              <div>
                {result.tracks.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-3.5 px-3.5 py-3 rounded-xl cursor-pointer transition-colors hover:bg-white/[0.04]"
                    onClick={() => addToQueue([{ ...t, albumTitle: undefined, artistName: undefined, coverUrl: undefined }], 0)}
                  >
                    <div
                      className="w-11 h-11 rounded-lg flex-shrink-0 flex items-center justify-center"
                      style={{ background: "#1a1a1a" }}
                    >
                      <Music2 size={16} style={{ color: "rgba(255,255,255,0.18)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] truncate" style={{ color: "rgba(255,255,255,0.9)" }}>{t.title}</p>
                    </div>
                    <span
                      className="text-[11px] flex-shrink-0 tabular-nums"
                      style={{ color: "rgba(255,255,255,0.2)" }}
                    >
                      {fmtDuration(t.duration_seconds)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 앨범 */}
          {(tab === "all" || tab === "albums") && result.albums.length > 0 && (
            <section>
              <p className="text-[10px] tracking-[0.18em] uppercase mb-5" style={{ color: "rgba(255,255,255,0.3)" }}>
                앨범
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                {result.albums.map((a) => <AlbumCard key={a.id} album={a} />)}
              </div>
            </section>
          )}

          {/* 아티스트 */}
          {(tab === "all" || tab === "artists") && result.artists.length > 0 && (
            <section>
              <p className="text-[10px] tracking-[0.18em] uppercase mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>
                아티스트
              </p>
              <div className="flex flex-wrap gap-1">
                {result.artists.map((a) => <ArtistCard key={a.id} artist={a} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
