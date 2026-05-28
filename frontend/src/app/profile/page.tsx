"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, Playlist, PublicUser, FollowRequest } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { ListMusic, Lock, Unlock, Check, X, UserCheck, UserX } from "lucide-react";

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

export default function ProfilePage() {
  const router = useRouter();
  const { user, setUser, initialized } = useAuthStore();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [stats, setStats] = useState({ followers: 0, following: 0 });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ display_name: "", bio: "" });
  const [modal, setModal] = useState<ModalType>(null);
  const [modalUsers, setModalUsers] = useState<PublicUser[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [followRequests, setFollowRequests] = useState<FollowRequest[]>([]);
  const [requestsExpanded, setRequestsExpanded] = useState(false);

  useEffect(() => {
    if (!initialized) return;
    if (!user) { router.replace("/login"); return; }
    setForm({ display_name: user.display_name, bio: user.bio ?? "" });
    api.getPlaylists().then(setPlaylists).catch(() => {});
    api.getPublicUser(user.id).then((p) => setStats({ followers: p.follower_count, following: p.following_count })).catch(() => {});
    api.getFollowRequests().then(setFollowRequests).catch(() => {});
  }, [user, initialized]);

  const openModal = useCallback(async (type: ModalType) => {
    if (!user || !type) return;
    setModal(type);
    setModalLoading(true);
    try {
      const list = type === "followers"
        ? await api.getFollowers(user.id)
        : await api.getFollowing(user.id);
      setModalUsers(list);
    } catch {
      setModalUsers([]);
    } finally {
      setModalLoading(false);
    }
  }, [user]);

  if (!initialized || !user) return null;

  const initials = user.display_name.slice(0, 2).toUpperCase();
  const joinedDate = new Date(user.created_at).toLocaleDateString("ko-KR", { year: "numeric", month: "long" });

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.updateProfile({
        display_name: form.display_name.trim() || user.display_name,
        bio: form.bio,
      });
      setUser(updated);
      setEditing(false);
    } catch {
      alert("저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const togglePrivate = async () => {
    try {
      const updated = await api.updateProfile({ is_private: !user.is_private });
      setUser(updated);
    } catch {
      alert("설정 변경 실패");
    }
  };

  const cancelEdit = () => {
    setEditing(false);
    setForm({ display_name: user.display_name, bio: user.bio ?? "" });
  };

  return (
    <>
      {modal && (
        <UserListModal
          title={modal === "followers" ? `팔로워 ${stats.followers}` : `팔로잉 ${stats.following}`}
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
              {editing ? (
                <input
                  autoFocus
                  className="bg-bg-elevated border border-border rounded-lg px-3 py-1 text-[22px] font-semibold w-full max-w-xs outline-none focus:border-accent transition-colors"
                  value={form.display_name}
                  onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") cancelEdit(); }}
                />
              ) : (
                <h1 className="text-[28px] font-semibold leading-tight" style={{ color: "rgba(255,255,255,0.9)" }}>
                  {user.display_name}
                </h1>
              )}
              {/* 비공개 배지 */}
              <button
                onClick={togglePrivate}
                title={user.is_private ? "공개로 전환" : "비공개로 전환"}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.08em] flex-shrink-0 transition-all"
                style={{
                  border: `1px solid ${user.is_private ? "rgba(200,255,0,0.3)" : "rgba(255,255,255,0.08)"}`,
                  color: user.is_private ? "rgba(200,255,0,0.7)" : "rgba(255,255,255,0.3)",
                  background: user.is_private ? "rgba(200,255,0,0.06)" : "transparent",
                }}
              >
                {user.is_private ? <Lock size={8} /> : <Unlock size={8} />}
                {user.is_private ? "비공개" : "공개"}
              </button>
              {user.role === "admin" && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent font-medium flex-shrink-0">관리자</span>
              )}
            </div>

            {/* 유저명 */}
            <p className="text-[13px] mb-2" style={{ color: "rgba(255,255,255,0.25)" }}>@{user.username}</p>

            {/* 바이오 */}
            {editing ? (
              <textarea
                className="bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm w-full max-w-md resize-none mb-3 outline-none focus:border-accent transition-colors"
                rows={2}
                placeholder="자기소개를 입력하세요"
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              />
            ) : (
              <p className="text-[13px] mb-4 max-w-md" style={{ color: "rgba(255,255,255,0.35)", lineHeight: "1.55" }}>
                {user.bio || `${joinedDate} 가입`}
              </p>
            )}

            {/* 버튼 */}
            {editing ? (
              <div className="flex gap-2 mb-5">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs transition-colors disabled:opacity-50"
                  style={{ border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.8)" }}
                >
                  <Check size={12} />
                  {saving ? "저장 중..." : "저장"}
                </button>
                <button
                  onClick={cancelEdit}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs transition-colors"
                  style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}
                >
                  <X size={12} />
                  취소
                </button>
              </div>
            ) : (
              <div className="flex gap-2 mb-5">
                <button
                  onClick={() => setEditing(true)}
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
                </button>
              </div>
            )}

            {/* 통계 */}
            <div className="flex gap-8">
              <button className="text-left group" onClick={() => openModal("following")}>
                <div className="text-[20px] font-semibold transition-colors group-hover:text-accent" style={{ color: "rgba(255,255,255,0.9)" }}>
                  {stats.following}
                </div>
                <div className="text-[10px] uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.35)" }}>팔로잉</div>
              </button>
              <button className="text-left group" onClick={() => openModal("followers")}>
                <div className="text-[20px] font-semibold transition-colors group-hover:text-accent" style={{ color: "rgba(255,255,255,0.9)" }}>
                  {stats.followers}
                </div>
                <div className="text-[10px] uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.35)" }}>팔로워</div>
              </button>
              <div>
                <div className="text-[20px] font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>{playlists.length}</div>
                <div className="text-[10px] uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.35)" }}>플레이리스트</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 팔로우 요청 ── */}
        {user.is_private && followRequests.length > 0 && (
          <section className="mb-10">
            <button
              className="flex items-center gap-2 mb-4 text-left group"
              onClick={() => setRequestsExpanded((v) => !v)}
            >
              <p className="text-[10px] tracking-[0.18em] uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>
                팔로우 요청
              </p>
              <span
                className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-semibold"
                style={{ background: "rgba(200,255,0,0.15)", color: "#c8ff00" }}
              >
                {followRequests.length}
              </span>
              <span className="text-[10px] ml-1 transition-colors" style={{ color: "rgba(255,255,255,0.2)" }}>
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
                      className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-semibold select-none"
                      style={{ background: "#222", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)" }}
                    >
                      {req.requester.display_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/users/${req.requester.id}`} className="text-[13px] font-medium hover:underline truncate block" style={{ color: "rgba(255,255,255,0.9)" }}>
                        {req.requester.display_name}
                      </Link>
                      <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>@{req.requester.username}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={async () => {
                          await api.acceptFollowRequest(req.id);
                          setFollowRequests((prev) => prev.filter((r) => r.id !== req.id));
                          setStats((s) => ({ ...s, followers: s.followers + 1 }));
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
          {playlists.length === 0 ? (
            <div className="flex items-center justify-center h-40 rounded-xl border border-border" style={{ background: "rgba(255,255,255,0.02)" }}>
              <p className="text-sm text-muted">아직 플레이리스트가 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {playlists.map((pl) => (
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
                  <div className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: "#222" }}>
                    <ListMusic size={18} style={{ color: "rgba(255,255,255,0.3)" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: "rgba(255,255,255,0.9)" }}>{pl.name}</p>
                    <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>{pl.track_count}곡</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
