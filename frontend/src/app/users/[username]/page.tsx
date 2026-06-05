"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, notFound } from "next/navigation";
import Link from "next/link";
import { api, PublicUser, Playlist, FollowRequest } from "@/lib/api";
import { AvatarCropModal } from "@/components/AvatarCropModal";
import { useAuthStore } from "@/store/authStore";
import { useDMPanelStore } from "@/store/dmPanelStore";
import {
  ListMusic, Lock, Unlock, X, Clock, MessageSquare, UserCheck, UserX, Camera,
} from "lucide-react";
import Image from "next/image";

type ModalType = "followers" | "following" | null;

function UserListModal({
  title, users, onClose,
}: {
  title: string; users: PublicUser[]; onClose: () => void;
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
                href={`/users/${u.username}`}
                onClick={onClose}
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/[0.04]"
              >
                <div
                  className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-[12px] font-semibold"
                  style={{ background: "#222", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)" }}
                >
                  {u.avatar_url ? (
                    <Image src={u.avatar_url} alt={u.display_name} width={36} height={36} className="object-cover w-full h-full" />
                  ) : (
                    u.display_name.slice(0, 2).toUpperCase()
                  )}
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
  const { username } = useParams<{ username: string }>();
  const router = useRouter();
  const { user: currentUser, setUser, initialized } = useAuthStore();
  const { openChat } = useDMPanelStore();

  const isSelf = initialized && !!currentUser && currentUser.username === username;

  // Shared
  const [isNotFound, setIsNotFound] = useState(false);
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalType>(null);
  const [modalUsers, setModalUsers] = useState<PublicUser[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  // Other-view
  const [following, setFollowing] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Self-view
  const [followRequests, setFollowRequests] = useState<FollowRequest[]>([]);
  const [requestsExpanded, setRequestsExpanded] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!initialized) return;
    if (!currentUser) { router.replace("/login"); return; }

    setLoading(true);

    if (isSelf) {
      Promise.all([
        api.getPublicUser(username),
        api.getPlaylists(),
        api.getFollowRequests(),
      ])
        .then(([p, pls, reqs]) => {
          setProfile(p);
          setPlaylists(pls);
          setFollowRequests(reqs);
        })
        .catch(() => setIsNotFound(true))
        .finally(() => setLoading(false));
    } else {
      api.getPublicUser(username)
        .then((p) => {
          setProfile(p);
          setFollowing(p.is_following);
          setPendingRequest(p.has_pending_request);
          return api.getUserPlaylists(p.id);
        })
        .then(setPlaylists)
        .catch(() => setIsNotFound(true))
        .finally(() => setLoading(false));
    }
  }, [username, currentUser?.username, initialized]);

  const openModal = useCallback(async (type: ModalType) => {
    if (!type || !profile) return;
    setModal(type);
    setModalLoading(true);
    try {
      const list = type === "followers"
        ? await api.getFollowers(profile.id)
        : await api.getFollowing(profile.id);
      setModalUsers(list);
    } catch {
      setModalUsers([]);
    } finally {
      setModalLoading(false);
    }
  }, [profile]);

  const handleFollow = async () => {
    if (!profile || followLoading || isSelf) return;
    setFollowLoading(true);
    try {
      if (following || pendingRequest) {
        await api.unfollowUser(profile.id);
        setFollowing(false);
        setPendingRequest(false);
        if (following) setProfile((p) => p ? { ...p, follower_count: p.follower_count - 1 } : p);
      } else {
        await api.followUser(profile.id);
        if (profile.is_private) {
          setPendingRequest(true);
        } else {
          setFollowing(true);
          setProfile((p) => p ? { ...p, follower_count: p.follower_count + 1 } : p);
        }
      }
    } catch { /* ignore */ } finally {
      setFollowLoading(false);
    }
  };

  const togglePrivate = async () => {
    if (!currentUser) return;
    try {
      const updated = await api.updateProfile({ is_private: !currentUser.is_private });
      setUser(updated);
      setProfile((p) => p ? { ...p, is_private: updated.is_private } : p);
    } catch {
      alert("설정 변경 실패");
    }
  };

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropImageSrc(URL.createObjectURL(file));
    e.target.value = "";
  };

  const handleAvatarCropConfirm = async (blob: Blob) => {
    setCropImageSrc(null);
    try {
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      const updated = await api.uploadAvatar(file);
      setProfile((p) => p ? { ...p, avatar_url: updated.avatar_url } : p);
      setUser({ ...currentUser!, avatar_url: updated.avatar_url });
    } catch {
      alert("사진 업로드 실패");
    }
  };

  if (isNotFound) notFound();
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
  const isPrivateBlocked = !isSelf && profile.is_private && !following;
  const joinedDate = currentUser ? new Date(currentUser.created_at).toLocaleDateString("ko-KR", { year: "numeric", month: "long" }) : "";

  return (
    <>
      {cropImageSrc && (
        <AvatarCropModal
          imageSrc={cropImageSrc}
          onConfirm={handleAvatarCropConfirm}
          onClose={() => { URL.revokeObjectURL(cropImageSrc); setCropImageSrc(null); }}
        />
      )}
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
          <div className="relative w-24 h-24 rounded-full flex-shrink-0 group">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.display_name}
                fill
                className="rounded-full object-cover"
                sizes="96px"
                style={{ border: "2px solid rgba(255,255,255,0.08)" }}
              />
            ) : (
              <div
                className="w-full h-full rounded-full flex items-center justify-center select-none"
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
            )}
            {isSelf && (
              <label className="absolute inset-0 rounded-full flex flex-col items-center justify-center gap-1 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera size={18} className="text-white" />
                <span className="text-[10px] text-white">변경</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarFileSelect} />
              </label>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* 이름 + 배지 */}
            <div className="flex items-center gap-2.5 mb-1 flex-wrap">
              <h1 className="text-[28px] font-semibold leading-tight" style={{ color: "rgba(255,255,255,0.9)" }}>
                {profile.display_name}
              </h1>

              {/* 온라인 배지 (타인) */}
              {!isSelf && profile.is_online && (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] flex-shrink-0"
                  style={{ border: "1px solid rgba(74,222,128,0.25)", color: "#4ade80", background: "rgba(74,222,128,0.08)" }}
                >
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#4ade80" }} />
                  온라인
                </span>
              )}

              {/* 비공개 배지 */}
              {isSelf ? (
                <button
                  onClick={togglePrivate}
                  title={currentUser!.is_private ? "공개로 전환" : "비공개로 전환"}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.08em] flex-shrink-0 transition-all"
                  style={{
                    border: `1px solid ${currentUser!.is_private ? "rgba(200,255,0,0.3)" : "rgba(255,255,255,0.08)"}`,
                    color: currentUser!.is_private ? "rgba(200,255,0,0.7)" : "rgba(255,255,255,0.3)",
                    background: currentUser!.is_private ? "rgba(200,255,0,0.06)" : "transparent",
                  }}
                >
                  {currentUser!.is_private ? <Lock size={8} /> : <Unlock size={8} />}
                  {currentUser!.is_private ? "비공개" : "공개"}
                </button>
              ) : profile.is_private ? (
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.08em] flex-shrink-0"
                  style={{ border: "1px solid rgba(200,255,0,0.3)", color: "rgba(200,255,0,0.7)", background: "rgba(200,255,0,0.06)" }}
                >
                  <Lock size={8} />
                  비공개
                </span>
              ) : null}

              {/* 관리자 배지 */}
              {isSelf && currentUser!.role === "admin" && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent font-medium flex-shrink-0">관리자</span>
              )}
            </div>

            {/* 유저명 */}
            <p className="text-[13px] mb-2" style={{ color: "rgba(255,255,255,0.25)" }}>@{profile.username}</p>

            {/* 바이오 */}
            {!isPrivateBlocked && (
              <p className="text-[13px] mb-4 max-w-md" style={{ color: "rgba(255,255,255,0.35)", lineHeight: "1.55" }}>
                {profile.bio || (isSelf ? `${joinedDate} 가입` : "")}
              </p>
            )}

            {/* 버튼 */}
            {isSelf ? (
              <div className="flex gap-2 mb-5">
                <Link
                  href="/settings"
                  className="px-[18px] py-[7px] rounded-full text-xs transition-colors"
                  style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.2)";
                    (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.9)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
                    (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.6)";
                  }}
                >
                  프로필 편집
                </Link>
              </div>
            ) : (
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
                  onClick={() => openChat(profile.id)}
                  className="inline-flex items-center gap-1.5 px-[18px] py-[7px] rounded-full text-xs transition-all"
                  style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
                >
                  <MessageSquare size={12} />
                  메시지
                </button>
              </div>
            )}

            {/* 지금 듣는 음악 (타인) */}
            {!isSelf && profile.now_playing && (
              <div
                className="flex items-center gap-3 mb-5 px-4 py-3 rounded-xl"
                style={{ background: "rgba(200,255,0,0.04)", border: "1px solid rgba(200,255,0,0.12)" }}
              >
                <span style={{ color: "#c8ff00", fontSize: 11, flexShrink: 0 }}>▶</span>
                <div className="min-w-0">
                  <p className="text-[12px] font-medium truncate" style={{ color: "rgba(255,255,255,0.8)" }}>
                    {profile.now_playing.title}
                  </p>
                  {profile.now_playing.artist_name && (
                    <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.35)" }}>
                      {profile.now_playing.artist_name}
                    </p>
                  )}
                </div>
              </div>
            )}

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
              {isSelf && (
                <div>
                  <div className="text-[20px] font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>{playlists.length}</div>
                  <div className="text-[10px] uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.35)" }}>플레이리스트</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── 팔로우 요청 (자신, 비공개 계정) ── */}
        {isSelf && currentUser!.is_private && followRequests.length > 0 && (
          <section className="mb-10">
            <button
              className="flex items-center gap-2 mb-4 text-left"
              onClick={() => setRequestsExpanded((v) => !v)}
            >
              <p className="text-[10px] tracking-[0.18em] uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>팔로우 요청</p>
              <span
                className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-semibold"
                style={{ background: "rgba(200,255,0,0.15)", color: "#c8ff00" }}
              >
                {followRequests.length}
              </span>
              <span className="text-[10px] ml-1" style={{ color: "rgba(255,255,255,0.2)" }}>
                {requestsExpanded ? "▲" : "▼"}
              </span>
            </button>
            {requestsExpanded && (
              <div className="flex flex-col gap-2">
                {followRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center gap-3 px-4 py-3 rounded-[14px] border border-border"
                    style={{ background: "#111" }}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-[11px] font-semibold select-none"
                      style={{ background: "#222", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)" }}
                    >
                      {req.requester.avatar_url ? (
                        <Image src={req.requester.avatar_url} alt={req.requester.display_name} width={36} height={36} className="object-cover w-full h-full" />
                      ) : (
                        req.requester.display_name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/users/${req.requester.username}`} className="text-[13px] font-medium hover:underline truncate block" style={{ color: "rgba(255,255,255,0.9)" }}>
                        {req.requester.display_name}
                      </Link>
                      <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>@{req.requester.username}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={async () => {
                          await api.acceptFollowRequest(req.id);
                          setFollowRequests((prev) => prev.filter((r) => r.id !== req.id));
                          setProfile((p) => p ? { ...p, follower_count: p.follower_count + 1 } : p);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] transition-colors"
                        style={{ background: "rgba(200,255,0,0.1)", border: "1px solid rgba(200,255,0,0.3)", color: "#c8ff00" }}
                      >
                        <UserCheck size={11} />
                        수락
                      </button>
                      <button
                        onClick={async () => {
                          await api.rejectFollowRequest(req.id);
                          setFollowRequests((prev) => prev.filter((r) => r.id !== req.id));
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] transition-colors"
                        style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}
                      >
                        <UserX size={11} />
                        거절
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

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
              <p className="text-sm text-muted">{isSelf ? "아직 플레이리스트가 없습니다." : "플레이리스트가 없습니다."}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {playlists.map((pl) => {
                const inner = (
                  <>
                    <div className="w-10 h-10 rounded-[10px] flex-shrink-0 overflow-hidden flex items-center justify-center" style={{ background: "#222" }}>
                      {pl.cover_art_url ? (
                        <Image src={pl.cover_art_url} alt={pl.name} width={40} height={40} className="object-cover w-full h-full" />
                      ) : (
                        <ListMusic size={18} style={{ color: "rgba(255,255,255,0.3)" }} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium truncate" style={{ color: "rgba(255,255,255,0.9)" }}>{pl.name}</p>
                      <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>{pl.track_count}곡</p>
                    </div>
                  </>
                );
                return isSelf ? (
                  <Link
                    key={pl.id}
                    href={`/playlists/${pl.id}`}
                    className="flex items-center gap-3 p-4 rounded-[14px] border border-border transition-all"
                    style={{ background: "#1a1a1a" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "#222";
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "#1a1a1a";
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
                    }}
                  >
                    {inner}
                  </Link>
                ) : (
                  <div key={pl.id} className="flex items-center gap-3 p-4 rounded-[14px] border border-border" style={{ background: "#1a1a1a" }}>
                    {inner}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
