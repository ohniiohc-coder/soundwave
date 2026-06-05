"use client";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Home, Disc3, Mic2, Search, Upload, ListMusic, LogIn, LogOut } from "lucide-react";
import Image from "next/image";
import clsx from "clsx";
import { useAuthStore } from "@/store/authStore";

const PLAYFAIR = "var(--font-playfair, 'Playfair Display', Georgia, serif)";

const navItems = [
  { href: "/", label: "홈", icon: Home },
  { href: "/browse", label: "검색", icon: Search },
  { href: "/albums", label: "앨범", icon: Disc3 },
  { href: "/artists", label: "아티스트", icon: Mic2 },
  { href: "/playlists", label: "플레이리스트", icon: ListMusic },
];

const adminNavItems = [
  { href: "/upload", label: "업로드", icon: Upload },
];

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [expanded, setExpanded] = useState(false);

  // 아이콘 버튼 공통 클래스: collapsed → justify-center / expanded → px-3 gap-3
  const btnBase = (extra?: string) =>
    clsx(
      "flex items-center py-3 rounded-xl transition-colors w-full",
      expanded ? "gap-3 px-3 justify-start" : "justify-center",
      extra
    );

  const labelStyle: React.CSSProperties = {
    maxWidth: expanded ? 140 : 0,
    opacity: expanded ? 1 : 0,
    overflow: "hidden",
    whiteSpace: "nowrap",
    transition: "max-width 0.2s, opacity 0.2s",
  };

  return (
    <aside
      className="flex flex-col bg-bg-panel border-r border-border py-4 gap-1 overflow-hidden transition-all duration-200 absolute inset-y-0 left-0 z-40"
      style={{ width: expanded ? 200 : 72 }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* 로고 */}
      <button
        onClick={() => router.push("/")}
        title="whatpl."
        className={clsx(
          "flex items-center h-12 mb-2 hover:bg-white/[0.06] rounded-xl mx-2 transition-colors flex-shrink-0",
          expanded ? "px-4 gap-0" : "justify-center"
        )}
      >
        {/* "w" — 항상 표시 */}
        <span
          className="flex-shrink-0 leading-none"
          style={{ fontFamily: PLAYFAIR, fontSize: 28, color: "rgba(255,255,255,0.9)", letterSpacing: "-0.02em" }}
        >
          w
        </span>
        {/* "." — collapsed 때만 표시 */}
        <span
          className="leading-none overflow-hidden transition-all duration-200"
          style={{
            fontFamily: PLAYFAIR,
            fontSize: 28,
            color: "#c8ff00",
            letterSpacing: "-0.02em",
            maxWidth: expanded ? 0 : 14,
            opacity: expanded ? 0 : 1,
          }}
        >
          .
        </span>
        {/* "hatpl." — expanded 때만 표시 */}
        <span
          className="overflow-hidden whitespace-nowrap transition-all duration-200"
          style={{
            fontFamily: PLAYFAIR,
            fontSize: 28,
            color: "rgba(255,255,255,0.9)",
            letterSpacing: "-0.02em",
            maxWidth: expanded ? 120 : 0,
            opacity: expanded ? 1 : 0,
          }}
        >
          hatpl<span style={{ color: "#c8ff00" }}>.</span>
        </span>
      </button>

      {/* 내비게이션 */}
      <nav className="flex flex-col gap-0.5 px-2 flex-1 justify-center">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href) && (href === "/" ? pathname === "/" : true);
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
              title={!expanded ? label : undefined}
              className={clsx(
                btnBase(),
                isActive
                  ? "bg-white/[0.12] text-white"
                  : "text-muted hover:text-white hover:bg-white/[0.08]"
              )}
            >
              <Icon size={24} className={clsx("flex-shrink-0", isActive ? "opacity-100" : "opacity-60")} />
              <span className="text-sm font-medium" style={labelStyle}>{label}</span>
            </button>
          );
        })}

        {user?.role === "admin" && adminNavItems.map(({ href, label, icon: Icon }) => (
          <button
            key={href}
            onClick={() => router.push(href)}
            title={!expanded ? label : undefined}
            className={clsx(
              btnBase(),
              pathname === href
                ? "bg-white/[0.12] text-white"
                : "text-muted hover:text-white hover:bg-white/[0.08]"
            )}
          >
            <Icon size={24} className="flex-shrink-0 opacity-60" />
            <span className="text-sm font-medium" style={labelStyle}>{label}</span>
          </button>
        ))}

        {/* 프로필 / 로그인 — nav 하단, 중앙 정렬 그룹에 포함 */}
        <div className="mt-2">
          {user ? (
            <button
              onClick={() => router.push(`/users/${user.username}`)}
              title={!expanded ? user.username : undefined}
              className={btnBase("hover:bg-white/[0.08]")}
            >
              <div className="w-[26px] h-[26px] rounded-full bg-bg-elevated border border-border flex items-center justify-center flex-shrink-0 overflow-hidden">
                {user.avatar_url ? (
                  <Image src={user.avatar_url} alt={user.display_name} width={26} height={26} className="object-cover w-full h-full" />
                ) : (
                  <span className="text-[10px] font-semibold text-muted">
                    {user.display_name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-sm text-muted" style={labelStyle}>{user.username}</span>
            </button>
          ) : (
            <button
              onClick={() => router.push("/login")}
              title={!expanded ? "로그인" : undefined}
              className={btnBase("text-muted hover:text-white hover:bg-white/[0.08]")}
            >
              <LogIn size={24} className="flex-shrink-0 opacity-60" />
              <span className="text-sm font-medium" style={labelStyle}>로그인</span>
            </button>
          )}
        </div>
      </nav>

      {/* 로그아웃 — 하단 고정 */}
      {user && (
        <div className="flex flex-col gap-0.5 px-2">
          <button
            onClick={() => { logout(); router.push("/"); }}
            title={!expanded ? "로그아웃" : undefined}
            className={btnBase("text-muted hover:text-white hover:bg-white/[0.08]")}
          >
            <LogOut size={22} className="flex-shrink-0 opacity-60" />
            <span className="text-sm font-medium" style={labelStyle}>로그아웃</span>
          </button>
        </div>
      )}
    </aside>
  );
}
