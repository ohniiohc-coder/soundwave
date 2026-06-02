"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Home, Disc3, Mic2, Search, Upload, ListMusic, LogIn, LogOut, Users, MessageSquare } from "lucide-react";
import clsx from "clsx";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

const navItems = [
  { href: "/", label: "홈", icon: Home },
  { href: "/browse", label: "탐색", icon: Search },
  { href: "/albums", label: "앨범", icon: Disc3 },
  { href: "/artists", label: "아티스트", icon: Mic2 },
  { href: "/playlists", label: "플레이리스트", icon: ListMusic },
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
  const [unreadDm, setUnreadDm] = useState(0);

  useEffect(() => {
    if (user) api.getUnreadCount().then((r) => setUnreadDm(r.count)).catch(() => {});
  }, [pathname, user]);

  return (
    <aside
      className="hidden md:flex flex-col items-center bg-bg-panel border-r border-border py-4 gap-1"
      style={{ width: "var(--sidebar-width)", minWidth: "var(--sidebar-width)" }}
    >
      {/* 로고 */}
      <button
        onClick={() => router.push("/")}
        className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/[0.06] transition-colors mb-3"
        title="whatpl."
      >
        <span
          className="text-[32px] text-white/90 leading-none"
          style={{ fontFamily: "var(--font-playfair, 'Playfair Display', Georgia, serif)", letterSpacing: "-0.02em" }}
        >
          w<span className="text-accent">.</span>
        </span>
      </button>

      {/* 내비게이션 */}
      <nav className="flex flex-col items-center gap-1 w-full px-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href) && (href === "/" ? pathname === "/" : true);
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
              title={label}
              className={clsx(
                "relative w-full flex items-center justify-center py-2.5 rounded-xl transition-colors",
                isActive
                  ? "bg-white/[0.08] text-white"
                  : "text-muted hover:text-white hover:bg-white/[0.04]"
              )}
            >
              <Icon size={20} className={isActive ? "opacity-100" : "opacity-60"} />
              {href === "/messages" && unreadDm > 0 && (
                <span
                  className="absolute top-1.5 right-2 flex items-center justify-center rounded-full text-[8px] font-bold min-w-[14px] h-3.5 px-1"
                  style={{ background: "#c8ff00", color: "#000" }}
                >
                  {unreadDm > 99 ? "99+" : unreadDm}
                </span>
              )}
            </button>
          );
        })}

        {user?.role === "admin" && adminNavItems.map(({ href, label, icon: Icon }) => (
          <button
            key={href}
            onClick={() => router.push(href)}
            title={label}
            className={clsx(
              "w-full flex items-center justify-center py-2.5 rounded-xl transition-colors",
              pathname === href
                ? "bg-white/[0.08] text-white"
                : "text-muted hover:text-white hover:bg-white/[0.04]"
            )}
          >
            <Icon size={20} className="opacity-60" />
          </button>
        ))}
      </nav>

      {/* 유저 / 로그인 — 하단 */}
      <div className="mt-auto flex flex-col items-center gap-1 w-full px-2">
        {user ? (
          <>
            <button
              onClick={() => router.push("/profile")}
              title={user.username}
              className="w-full flex items-center justify-center py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-bg-elevated border border-border flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-semibold text-muted">
                  {user.display_name.slice(0, 2).toUpperCase()}
                </span>
              </div>
            </button>
            <button
              onClick={() => { logout(); router.push("/"); }}
              title="로그아웃"
              className="w-full flex items-center justify-center py-2.5 rounded-xl text-muted hover:text-white hover:bg-white/[0.04] transition-colors"
            >
              <LogOut size={18} className="opacity-60" />
            </button>
          </>
        ) : (
          <button
            onClick={() => router.push("/login")}
            title="로그인"
            className="w-full flex items-center justify-center py-2.5 rounded-xl text-muted hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            <LogIn size={20} className="opacity-60" />
          </button>
        )}
      </div>
    </aside>
  );
}
