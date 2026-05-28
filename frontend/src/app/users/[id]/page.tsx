"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, PublicUser, Playlist } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { ListMusic, Lock, X, Clock, MessageSquare } from "lucide-react";

type ModalType = "followers" | "following" | null;

function UserListModal({
  title,
  users,
  onClose,
}: {
  title: string;
  users: PublicUser[];
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border overflow-hidden"
        style={{ background: "#111", maxHeight: "70vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.9)" }}>{title}</p>
          <button onClick={onClose} className="text-muted hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: "calc(70vh - 56px)" }}>
          {users.length === 0 ? (
            <p className="text-center py-10 text-sm text-muted">아직 없습니다.</p>
          ) : (
            users.map((u) => (
              <Link
                key={u.id}
                href={`/users/${u.id}`}
                onClick={onClose}
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/[0.04]"
              >
                <div
                  className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-[12px] font-semibold"
                  style={{ background: "#222", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)" }}
                >
                  {u.display_name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] truncate" style={{ color: "rgba(255,255,255,0.9)" }}>{u.display_name}</p>
                  <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>@{u.username}</p>
                </div>
                {u.is_private && <Lock size={11} className="flex-shrink-0 text-muted ml-auto" />}
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user: currentUser, initialized } = useAuthStore();

  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [modal, setModal] = useState<ModalType>(null);
  const [modalUsers, setModalUsers] = useState<PublicUser[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    if (!initialized) return;
    if (!currentUser) { router.replace("/login"); return; }
    if (currentUser.id === id) { router.replace("/profile"); return; }

    setLoading(true);
    api.getPublicUser(id)
      .then((p) => {
        setProfile(p);
        setFollowing(p.is_following);
        setPendingRequest(p.has_pending_request);
        return api.getUserPlaylists(id);
      })
      .then(setPlaylists)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, currentUser, initialized]);

  const openModal = useCallback(async (type: ModalType) => {
    if (!type) return;
    setModal(type);
    setModalLoading(true);
    try {
      const list = type === "followers"
        ? await api.getFollowers(id)
        : await api.getFollowing(id);
      setModalUsers(list);
    } catch {
      setModalUsers([]);
    } finally {
      setModalLoading(false);
    }
  }, [id]);

  const handleFollow = async () => {
    if (!profile || followLoading) return;
    setFollowLoading(true);
    try {
      if (following || pendingRequest) {
        await api.unfollowUser(id);
        setFollowing(false);
        setPendingRequest(false);
        if (following) setProfile((p) => p ? { ...p, follower_count: p.follower_count - 1 } : p);
      } else {
        await api.followUser(id);
        if (profile.is_private) {
          setPendingRequest(true);
        } else {
          setFollowing(true);
          setProfile((p) => p ? { ...p, follower_count: p.follower_count + 1 } : p);
        }
      }
    } catch {
      // ignore
    } finally {
      setFollowLoading(false);
    }
  };

  if (!initialized || loading || !profile) {
    return (
      <div className="p-8 md:p-10">
        <div className="flex items-end gap-7 mb-11 pb-9 animate-pulse" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="w-24 h-24 rounded-full flex-shrink-0" style={{ background: "#1a1a1a" }} />
          <div className="flex-1 space-y-3">
            <div className="h-7 rounded-lg w-48" style={{ background: "#1a1a1a" }} />
            <div className="h-4 rounded-lg w-24" style={{ background: "#1a1a1a" }} />
          </div>
        </div>
      </div>
    );
  }

  const initials = profile.display_name.slice(0, 2).toUpperCase();
  const isPrivateBlocked = profile.is_private && !following;

  return (
    <>
      {modal && (
        <UserListModal
          title={modal === "followers" ? `팔로워 ${profile.follower_count}` : `팔로잉 ${profile.following_count}`}
          users={modalLoading ? [] : modalUsers}
          onClose={() => setModal(null)}
        />
      )}

      <div className="p-8 md:p-10">
        {/* ── 프로필 헤더 ── */}
        <div className="flex items-end gap-7 mb-11 pb-9" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          {/* 아바타 */}
          <div
            className="w-24 h-24 rounded-full flex-shrink-0 flex items-center justify-center select-none"
            style={{
              border: "2px solid rgba(255,255,255,0.08)",
              fontFamily: "var(--font-playfair, 'Playfair Display', Georgia, serif)",
              fontSize: "38px",
              color: "rgba(255,255,255,0.12)",
              background: "#111",
            }}
          >
            {initials}
          </div>

          {/* 정보 */}
          <div className="flex-1 min-w-0">
            {/* 이름 + 배지 */}
            <div className="flex items-center gap-2.5 mb-1 flex-wrap">
              <h1 className="text-[28px] font-semibold leading-tight" style={{ color: "rgba(255,255,255,0.9)" }}>
                {profile.display_name}
              </h1>
              {profile.is_private && (
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.08em] flex-shrink-0"
                  style={{
                    border: "1px solid rgba(200,255,0,0.3)",
                    color: "rgba(200,255,0,0.7)",
                    background: "rgba(200,255,0,0.06)",
                  }}
                >
                  <Lock size={8} />
                  비공개
                </span>
              )}
            </div>

            {/* 유저명 */}
            <p className="text-[13px] mb-2" style={{ color: "rgba(255,255,255,0.25)" }}>@{profile.username}</p>

            {/* 바이오 */}
            {profile.bio && !isPrivateBlocked && (
              <p className="text-[13px] mb-4 max-w-md" style={{ color: "rgba(255,255,255,0.35)", lineHeight: "1.55" }}>
                {profile.bio}
              </p>
            )}

            {/* 팔로우 / 메시지 버튼 */}
            <div className="flex gap-2 mb-5">
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className="inline-flex items-center gap-1.5 px-[18px] py-[7px] rounded-full text-xs transition-all disabled:opacity-50"
                style={following ? {
                  border: "1px solid rgba(200,255,0,0.4)",
                  color: "rgba(200,255,0,0.9)",
                  background: "rgba(200,255,0,0.06)",
                } : pendingRequest ? {
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.4)",
                  background: "rgba(255,255,255,0.03)",
                } : {
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.85)",
                  background: "rgba(255,255,255,0.04)",
                }}
              >
                {!followLoading && pendingRequest && <Clock size={11} />}
                {followLoading ? "..." : following ? "팔로잉" : pendingRequest ? "요청됨" : "팔로우"}
              </button>
              <button
                onClick={() => router.push(`/messages?with=${id}`)}
                className="inline-flex items-center gap-1.5 px-[18px] py-[7px] rounded-full text-xs transition-all"
                style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
              >
                <MessageSquare size={12} />
                메시지
              </button>
            </div>

            {/* 통계 */}
            <div className="flex gap-8">
              <button className="text-left group" onClick={() => openModal("following")}>
                <div className="text-[20px] font-semibold transition-colors group-hover:text-accent" style={{ color: "rgba(255,255,255,0.9)" }}>
                  {profile.following_count}
                </div>
                <div className="text-[10px] uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.35)" }}>팔로잉</div>
              </button>
              <button className="text-left group" onClick={() => openModal("followers")}>
                <div className="text-[20px] font-semibold transition-colors group-hover:text-accent" style={{ color: "rgba(255,255,255,0.9)" }}>
                  {profile.follower_count}
                </div>
                <div className="text-[10px] uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.35)" }}>팔로워</div>
              </button>
            </div>
          </div>
        </div>

        {/* ── 플레이리스트 ── */}
        <section>
          <p className="text-[10px] tracking-[0.18em] uppercase mb-5" style={{ color: "rgba(255,255,255,0.3)" }}>
            플레이리스트
          </p>
          {isPrivateBlocked ? (
            <div className="flex flex-col items-center justify-center h-40 rounded-xl border border-border gap-3" style={{ background: "rgba(255,255,255,0.02)" }}>
              <Lock size={22} style={{ color: "rgba(255,255,255,0.15)" }} />
              <p className="text-sm text-muted">비공개 계정입니다.</p>
            </div>
          ) : playlists.length === 0 ? (
            <div className="flex items-center justify-center h-40 rounded-xl border border-border" style={{ background: "rgba(255,255,255,0.02)" }}>
              <p className="text-sm text-muted">플레이리스트가 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {playlists.map((pl) => (
                <div
                  key={pl.id}
                  className="flex items-center gap-3 p-4 rounded-[14px] border border-border"
                  style={{ background: "#1a1a1a" }}
                >
                  <div className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: "#222" }}>
                    <ListMusic size={18} style={{ color: "rgba(255,255,255,0.3)" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: "rgba(255,255,255,0.9)" }}>{pl.name}</p>
                    <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>{pl.track_count}곡</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
