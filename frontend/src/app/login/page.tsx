"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Music2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.login(form.username, form.password);
      setAuth(res.user, res.access_token);
      router.push("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("401")) setError("사용자 이름 또는 비밀번호가 올바르지 않습니다");
      else setError("로그인에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Music2 size={28} className="text-accent" />
          <span className="text-2xl font-bold tracking-tight">Soundwave</span>
        </div>

        <div className="bg-bg-panel border border-border rounded-2xl p-8">
          <h1 className="text-xl font-bold mb-6 text-center">로그인</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-muted mb-1.5">사용자 이름</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm">@</span>
                <input
                  type="text"
                  required
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.toLowerCase() }))}
                  className="w-full bg-bg-elevated border border-border rounded-lg pl-8 pr-4 py-2.5 text-sm outline-none focus:border-accent transition-colors"
                  placeholder="username"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1.5">비밀번호</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full bg-bg-elevated border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-accent transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent text-black font-semibold py-2.5 rounded-lg text-sm hover:bg-accent-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>

          <p className="text-center text-xs text-muted mt-6">
            계정이 없으신가요?{" "}
            <Link href="/register" className="text-accent hover:underline">
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
