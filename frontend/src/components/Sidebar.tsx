"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Home, Disc3, Mic2, Search, Upload, ListMusic, Plus, LogIn, LogOut, Users, MessageSquare } from "lucide-react";
import clsx from "clsx";
import { api, Playlist } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";

const navItems = [
  { href: "/", label: "홈", icon: Home },
  { href: "/browse", label: "탐색", icon: Search },
  { href: "/albums", label: "앨범", icon: Disc3 },
  { href: "/artists", label: "아티스트", icon: Mic2 },
  { href: "/people", label: "사람 찾기", icon: Users },
  { href: "/messages", label: "메시지", icon: MessageSquare },
];

const adminNavItems = [
  { href: "/upload", label: "업로드", icon: Upload },
];

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [unreadDm, setUnreadDm] = useState(0);

  useEffect(() => {
    api.getPlaylists().then(setPlaylists).catch(() => {});
    if (user) api.getUnreadCount().then((r) => setUnreadDm(r.count)).catch(() => {});
  }, [pathname, user]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      const pl = await api.createPlaylist(name);
      setPlaylists((prev) => [pl, ...prev]);
      setNewName("");
      setCreating(false);
      router.push(`/playlists/${pl.id}`);
    } catch {}
  };

  const isPlaylistActive = pathname.startsWith("/playlists");

  return (
    <aside
      className="hidden md:flex flex-col bg-bg-panel border-r border-border"
      style={{ width: "var(--sidebar-width)", minWidth: "var(--sidebar-width)" }}
    >
      {/* 로고 */}
      <div className="px-6 pt-6 pb-5">
        <button onClick={() => router.push("/")} className="hover:opacity-75 transition-opacity">
          <span
            className="text-[22px] text-white/90 leading-none"
            style={{ fontFamily: "var(--font-playfair, 'Playfair Display', Georgia, serif)", letterSpacing: "-0.02em" }}
          >
            whatpl<span className="text-accent">.</span>
          </span>
        </button>
      </div>

      {/* 내비게이션 */}
      <div className="flex-1 overflow-y-auto">
        <nav className="px-3 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => (
            <button
              key={href}
              onClick={() => router.push(href)}
              className={clsx(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-left",
                pathname.startsWith(href) && (href === "/" ? pathname === "/" : true)
                  ? "bg-white/[0.07] text-white font-medium"
                  : "text-muted hover:text-white hover:bg-white/[0.04]"
              )}
            >
              <Icon size={18} className="flex-shrink-0 opacity-70" />
              <span className="flex-1">{label}</span>
              {href === "/messages" && unreadDm > 0 && (
                <span
                  className="flex-shrink-0 flex items-center justify-center rounded-full text-[9px] font-semibold min-w-[16px] h-4 px-1"
                  style={{ background: "#c8ff00", color: "#000" }}
                >
                  {unreadDm > 99 ? "99+" : unreadDm}
                </span>
              )}
            </button>
          ))}

          {user?.role === "admin" && adminNavItems.map(({ href, label, icon: Icon }) => (
            <button
              key={href}
              onClick={() => router.push(href)}
              className={clsx(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-left",
                pathname === href
                  ? "bg-white/[0.07] text-white font-medium"
                  : "text-muted hover:text-white hover:bg-white/[0.04]"
              )}
            >
              <Icon size={18} className="flex-shrink-0 opacity-70" />
              {label}
            </button>
          ))}

          {/* 플레이리스트 */}
          <div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => router.push("/playlists")}
                className={clsx(
                  "flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-left",
                  isPlaylistActive
                    ? "bg-white/[0.07] text-white font-medium"
                    : "text-muted hover:text-white hover:bg-white/[0.04]"
                )}
              >
                <ListMusic size={18} className="flex-shrink-0 opacity-70" />
                플레이리스트
              </button>
              {user && (
                <button
                  onClick={() => { setCreating(true); setNewName(""); }}
                  className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/[0.04] transition-colors flex-shrink-0"
                  title="새 플레이리스트"
                >
                  <Plus size={15} />
                </button>
              )}
            </div>

            {creating && (
              <div className="pl-9 pr-2 mt-1 mb-1">
                <input
                  autoFocus
                  type="text"
                  placeholder="이름 입력 후 Enter"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                    if (e.key === "Escape") { setCreating(false); setNewName(""); }
                  }}
                  className="w-full bg-bg-elevated border border-border rounded-lg px-2 py-1.5 text-xs outline-none focus:border-accent transition-colors"
                />
              </div>
            )}

            <div className="pl-6 mt-0.5 space-y-0.5">
              {playlists.map((pl) => (
                <button
                  key={pl.id}
                  onClick={() => router.push(`/playlists/${pl.id}`)}
                  className={clsx(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors text-left",
                    pathname === `/playlists/${pl.id}`
                      ? "bg-white/[0.07] text-white"
                      : "text-muted hover:text-white hover:bg-white/[0.04]"
                  )}
                >
                  <ListMusic size={14} className="flex-shrink-0 opacity-70" />
                  <span className="truncate flex-1">{pl.name}</span>
                  <span className="text-xs text-muted flex-shrink-0">{pl.track_count}</span>
                </button>
              ))}
            </div>
          </div>
        </nav>
      </div>

      {/* 유저 정보 / 로그인 */}
      <div className="px-3 py-3 border-t border-border">
        {user ? (
          <div className="flex items-center gap-1">
            <div
              className="flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer min-w-0"
              onClick={() => router.push("/profile")}
            >
              <div className="w-7 h-7 rounded-full bg-bg-elevated border border-border flex items-center justify-center flex-shrink-0">
                <span className="text-[11px] font-semibold text-muted">
                  {user.display_name.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <span className="text-sm text-muted truncate flex-1">{user.username}</span>
              {user.role === "admin" && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent font-medium flex-shrink-0">관리자</span>
              )}
            </div>
            <button
              onClick={() => { logout(); router.push("/"); }}
              className="p-2 rounded-xl text-muted hover:text-white hover:bg-white/[0.04] transition-colors flex-shrink-0"
              title="로그아웃"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => router.push("/login")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            <LogIn size={18} className="opacity-70 flex-shrink-0" />
            로그인
          </button>
        )}
      </div>
    </aside>
  );
}
