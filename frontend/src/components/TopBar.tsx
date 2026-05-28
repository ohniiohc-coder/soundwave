"use client";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, User, Music2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

export function TopBar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  return (
    <div className="flex-shrink-0 flex items-center justify-between px-6 h-14 border-b border-border bg-bg-panel">
      {/* 로고 */}
      <button
        onClick={() => router.push("/")}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        <Music2 size={22} className="text-accent" />
        <span className="text-lg font-semibold tracking-tight">Soundwave</span>
      </button>
      {user ? (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
              <User size={13} className="text-accent" />
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium">{user.display_name}</span>
                {user.role === "admin" && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent font-medium">
                    관리자
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted">@{user.username}</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); router.push("/"); }}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-white transition-colors"
            title="로그아웃"
          >
            <LogOut size={14} />
            로그아웃
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/register")}
            className="text-xs text-muted hover:text-white transition-colors px-3 py-1.5"
          >
            회원가입
          </button>
          <button
            onClick={() => router.push("/login")}
            className="flex items-center gap-1.5 text-xs bg-accent text-black font-semibold px-4 py-1.5 rounded-full hover:bg-accent-light transition-colors"
          >
            <LogIn size={13} />
            로그인
          </button>
        </div>
      )}
    </div>
  );
}
