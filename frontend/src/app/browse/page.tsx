"use client";
import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Search, Music2, Lock, UserCheck, UserPlus, Clock } from "lucide-react";
import { api, SearchResult, PublicUser } from "@/lib/api";
import { AlbumCard } from "@/components/AlbumCard";
import { ArtistCard } from "@/components/ArtistCard";
import { usePlayerStore } from "@/store/playerStore";
import { useAuthStore } from "@/store/authStore";

type Tab = "all" | "tracks" | "albums" | "artists" | "people";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "tracks", label: "트랙" },
  { key: "albums", label: "앨범" },
  { key: "artists", label: "아티스트" },
  { key: "people", label: "사람" },
];

function fmtDuration(secs: number | null) {
  if (!secs) return "";
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
}

function UserCard({
  user,
  onFollowChange,
}: {
  user: PublicUser;
  onFollowChange: (id: string, state: "following" | "pending" | "none") => void;
}) {
  const [loading, setLoading] = useState(false);
  const initials = user.display_name.slice(0, 2).toUpperCase();

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      if (user.is_following || user.has_pending_request) {
        await api.unfollowUser(user.id);
        onFollowChange(user.id, "none");
      } else {
        await api.followUser(user.id);
        onFollowChange(user.id, user.is_private ? "pending" : "following");
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <Link
      href={`/users/${user.username}`}
      className="flex items-center gap-4 p-4 rounded-[14px] border border-border transition-all"
      style={{ background: "#111" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "#1a1a1a";
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "#111";
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
      }}
    >
      <div className="relative flex-shrink-0">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-[13px] font-semibold select-none"
          style={{
            background: "#222",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.25)",
            fontFamily: "var(--font-playfair, 'Playfair Display', Georgia, serif)",
          }}
        >
          {initials}
        </div>
        {user.is_online && (
          <span
            className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
            style={{ background: "#4ade80", borderColor: "#111" }}
          />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <p className="text-[13px] font-medium truncate" style={{ color: "rgba(255,255,255,0.9)" }}>
            {user.display_name}
          </p>
          {user.is_private && <Lock size={10} style={{ color: "rgba(255,255,255,0.25)", flexShrink: 0 }} />}
        </div>
        <p className="text-[11px] truncate" style={{ color: "rgba(255,255,255,0.3)" }}>@{user.username}</p>
        {user.now_playing ? (
          <div className="flex items-center gap-1 mt-0.5">
            <span style={{ color: "#c8ff00", fontSize: 8, lineHeight: 1 }}>▶</span>
            <p className="text-[11px] truncate" style={{ color: "rgba(200,255,0,0.6)" }}>
              {user.now_playing.title}
              {user.now_playing.artist_name && ` · ${user.now_playing.artist_name}`}
            </p>
          </div>
        ) : user.bio ? (
          <p className="text-[11px] truncate mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>{user.bio}</p>
        ) : null}
        <div className="flex gap-3 mt-1.5">
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
            팔로워 <span style={{ color: "rgba(255,255,255,0.5)" }}>{user.follower_count}</span>
          </span>
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
            팔로잉 <span style={{ color: "rgba(255,255,255,0.5)" }}>{user.following_count}</span>
          </span>
        </div>
      </div>

      <button
        onClick={handleFollow}
        disabled={loading}
        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] transition-all disabled:opacity-50"
        style={user.is_following ? {
          border: "1px solid rgba(200,255,0,0.35)",
          color: "rgba(200,255,0,0.85)",
          background: "rgba(200,255,0,0.05)",
        } : user.has_pending_request ? {
          border: "1px solid rgba(255,255,255,0.12)",
          color: "rgba(255,255,255,0.4)",
          background: "rgba(255,255,255,0.03)",
        } : {
          border: "1px solid rgba(255,255,255,0.12)",
          color: "rgba(255,255,255,0.7)",
          background: "transparent",
        }}
      >
        {loading ? (
          <span style={{ width: 12, height: 12, display: "inline-block" }} />
        ) : user.is_following ? (
          <UserCheck size={12} />
        ) : user.has_pending_request ? (
          <Clock size={12} />
        ) : (
          <UserPlus size={12} />
        )}
        {user.is_following ? "팔로잉" : user.has_pending_request ? "요청됨" : "팔로우"}
      </button>
    </Link>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [musicResult, setMusicResult] = useState<SearchResult | null>(null);
  const [peopleResult, setPeopleResult] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("all");
  const { addToQueue } = usePlayerStore();
  const { user: currentUser } = useAuthStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setMusicResult(null);
      setPeopleResult([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const [music, people] = await Promise.all([
          api.search(q),
          api.searchUsers(q).catch(() => [] as PublicUser[]),
        ]);
        setMusicResult(music);
        setPeopleResult(people.filter((u) => u.id !== currentUser?.id));
      } catch {
        setMusicResult(null);
        setPeopleResult([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [currentUser]);

  const handleFollowChange = (id: string, state: "following" | "pending" | "none") => {
    setPeopleResult((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u;
        const wasActive = u.is_following;
        return {
          ...u,
          is_following: state === "following",
          has_pending_request: state === "pending",
          follower_count: u.follower_count + (state === "following" ? 1 : wasActive ? -1 : 0),
        };
      })
    );
  };

  const hasMusicResults = musicResult &&
    (musicResult.tracks.length > 0 || musicResult.albums.length > 0 || musicResult.artists.length > 0);
  const hasAnyResults = hasMusicResults || peopleResult.length > 0;
  const searched = !!query.trim();

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
        검색
      </h1>

      {/* 검색창 */}
      <div className="relative mb-7 max-w-2xl">
        <Search size={16} className="absolute left-[18px] top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "rgba(255,255,255,0.3)" }} />
        <input
          type="text"
          placeholder="아티스트, 트랙, 앨범, 사람..."
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
      {searched && !loading && (
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
      {searched && !hasAnyResults && !loading && (
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>검색 결과가 없습니다.</p>
      )}

      {searched && hasAnyResults && !loading && (
        <div className="space-y-10">
          {/* 트랙 */}
          {(tab === "all" || tab === "tracks") && musicResult && musicResult.tracks.length > 0 && (
            <section>
              <p className="text-[10px] tracking-[0.18em] uppercase mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>
                트랙
              </p>
              <div>
                {musicResult.tracks.map((t) => (
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
          {(tab === "all" || tab === "albums") && musicResult && musicResult.albums.length > 0 && (
            <section>
              <p className="text-[10px] tracking-[0.18em] uppercase mb-5" style={{ color: "rgba(255,255,255,0.3)" }}>
                앨범
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                {musicResult.albums.map((a) => <AlbumCard key={a.id} album={a} />)}
              </div>
            </section>
          )}

          {/* 아티스트 */}
          {(tab === "all" || tab === "artists") && musicResult && musicResult.artists.length > 0 && (
            <section>
              <p className="text-[10px] tracking-[0.18em] uppercase mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>
                아티스트
              </p>
              <div className="flex flex-wrap gap-1">
                {musicResult.artists.map((a) => <ArtistCard key={a.id} artist={a} />)}
              </div>
            </section>
          )}

          {/* 사람 */}
          {(tab === "all" || tab === "people") && peopleResult.length > 0 && (
            <section>
              <p className="text-[10px] tracking-[0.18em] uppercase mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>
                사람
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(tab === "all" ? peopleResult.slice(0, 6) : peopleResult).map((u) => (
                  <UserCard key={u.id} user={u} onFollowChange={handleFollowChange} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
