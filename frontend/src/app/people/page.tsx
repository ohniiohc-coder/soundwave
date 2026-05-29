"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, PublicUser } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Search, Lock, UserCheck, UserPlus, Clock } from "lucide-react";

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
      href={`/users/${user.id}`}
      className="flex items-center gap-4 p-4 rounded-[14px] border border-border transition-all group"
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
      {/* 아바타 + 온라인 점 */}
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

      {/* 정보 */}
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

      {/* 팔로우 버튼 */}
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

export default function PeoplePage() {
  const router = useRouter();
  const { user: currentUser, initialized } = useAuthStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!initialized) return;
    if (!currentUser) { router.replace("/login"); return; }
  }, [initialized, currentUser]);

  const doSearch = useCallback(async (q: string) => {
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.searchUsers(q);
      setResults(res.filter((u) => u.id !== currentUser?.id));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  const handleFollowChange = (id: string, state: "following" | "pending" | "none") => {
    setResults((prev) =>
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

  if (!initialized || !currentUser) return null;

  return (
    <div className="p-8 md:p-10">
      {/* 헤더 */}
      <h1
        className="mb-8 leading-none"
        style={{
          fontFamily: "var(--font-playfair, 'Playfair Display', Georgia, serif)",
          fontSize: "clamp(32px, 4vw, 42px)",
          color: "rgba(255,255,255,0.9)",
          letterSpacing: "-0.02em",
        }}
      >
        사람 찾기
      </h1>

      {/* 검색 입력 */}
      <div className="relative mb-8 max-w-lg">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "rgba(255,255,255,0.3)" }}
        />
        <input
          autoFocus
          type="text"
          placeholder="이름 또는 아이디로 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-2xl outline-none transition-colors text-sm"
          style={{
            background: "#1a1a1a",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.9)",
            padding: "13px 18px 13px 42px",
            fontSize: "14px",
          }}
          onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.2)"; }}
          onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)"; }}
        />
      </div>

      {/* 결과 */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-4 rounded-[14px] border border-border animate-pulse"
              style={{ background: "#111" }}
            >
              <div className="w-11 h-11 rounded-full flex-shrink-0" style={{ background: "#1a1a1a" }} />
              <div className="flex-1 space-y-2">
                <div className="h-3 rounded w-28" style={{ background: "#1a1a1a" }} />
                <div className="h-2.5 rounded w-20" style={{ background: "#1a1a1a" }} />
              </div>
            </div>
          ))}
        </div>
      ) : searched && results.length === 0 ? (
        <div className="flex items-center justify-center h-40 rounded-xl border border-border" style={{ background: "rgba(255,255,255,0.02)" }}>
          <p className="text-sm text-muted">검색 결과가 없습니다.</p>
        </div>
      ) : !searched ? (
        <div className="flex items-center justify-center h-40 rounded-xl border border-border" style={{ background: "rgba(255,255,255,0.02)" }}>
          <p className="text-sm text-muted">이름이나 아이디를 입력해 검색하세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {results.map((u) => (
            <UserCard key={u.id} user={u} onFollowChange={handleFollowChange} />
          ))}
        </div>
      )}
    </div>
  );
}
