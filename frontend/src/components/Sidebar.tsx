"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Home, Disc3, Mic2, Search, Upload, Music2, ListMusic, Plus } from "lucide-react";
import clsx from "clsx";
import { api, Playlist } from "@/lib/api";

const navItems = [
  { href: "/", label: "홈", icon: Home },
  { href: "/browse", label: "탐색", icon: Search },
  { href: "/albums", label: "앨범", icon: Disc3 },
  { href: "/artists", label: "아티스트", icon: Mic2 },
  { href: "/upload", label: "업로드", icon: Upload },
];

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    api.getPlaylists().then(setPlaylists).catch(() => {});
  }, [pathname]);

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
      <div className="flex items-center gap-2 px-6 py-5 border-b border-border">
        <Music2 size={22} className="text-accent" />
        <span className="text-lg font-semibold tracking-tight">Soundwave</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <nav className="px-3 py-4 space-y-1">
          {/* 기본 메뉴 */}
          {navItems.map(({ href, label, icon: Icon }) => (
            <button
              key={href}
              onClick={() => router.push(href)}
              className={clsx(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left",
                pathname === href
                  ? "bg-bg-elevated text-accent"
                  : "text-muted hover:text-white hover:bg-bg-hover"
              )}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}

          {/* 플레이리스트 탭 (다른 메뉴와 동일한 스타일) */}
          <div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => router.push("/playlists")}
                className={clsx(
                  "flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left",
                  isPlaylistActive
                    ? "bg-bg-elevated text-accent"
                    : "text-muted hover:text-white hover:bg-bg-hover"
                )}
              >
                <ListMusic size={18} />
                플레이리스트
              </button>
              <button
                onClick={() => { setCreating(true); setNewName(""); }}
                className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-bg-hover transition-colors flex-shrink-0"
                title="새 플레이리스트"
              >
                <Plus size={15} />
              </button>
            </div>

            {/* 새 플레이리스트 입력 */}
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
                  className="w-full bg-bg-elevated border border-border rounded px-2 py-1 text-xs outline-none focus:border-accent"
                />
              </div>
            )}

            {/* 플레이리스트 목록 (들여쓰기로 하위 구조 표현) */}
            <div className="pl-6 mt-0.5 space-y-0.5">
              {playlists.map((pl) => (
                <button
                  key={pl.id}
                  onClick={() => router.push(`/playlists/${pl.id}`)}
                  className={clsx(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                    pathname === `/playlists/${pl.id}`
                      ? "bg-bg-elevated text-accent"
                      : "text-muted hover:text-white hover:bg-bg-hover"
                  )}
                >
                  <ListMusic size={14} className="flex-shrink-0" />
                  <span className="truncate flex-1">{pl.name}</span>
                  <span className="text-xs text-muted flex-shrink-0">{pl.track_count}</span>
                </button>
              ))}
            </div>
          </div>
        </nav>
      </div>

      <div className="px-6 py-4 border-t border-border">
        <p className="text-xs text-muted">Soundwave v1.0</p>
      </div>
    </aside>
  );
}
