"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Music2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ display_name: "", username: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!form.display_name.trim())
      return "이름을 입력해 주세요";
    if (form.username.length < 2 || form.username.length > 30)
      return "사용자 이름은 2~30자여야 합니다";
    if (!/^[a-zA-Z0-9_.]+$/.test(form.username))
      return "사용자 이름은 영문, 숫자, 밑줄(_), 점(.)만 사용할 수 있습니다";
    if (form.password.length < 8)
      return "비밀번호는 8자 이상이어야 합니다";
    if (form.password !== form.confirm)
      return "비밀번호가 일치하지 않습니다";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setError("");
    setLoading(true);
    try {
      const res = await api.register(form.display_name, form.username, form.password);
      setAuth(res.user, res.access_token);
      router.push("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("400")) setError("이미 사용 중인 이메일 또는 사용자 이름입니다");
      else setError("회원가입에 실패했습니다. 다시 시도해 주세요.");
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
          <h1 className="text-xl font-bold mb-6 text-center">회원가입</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-muted mb-1.5">이름</label>
              <input
                type="text"
                required
                value={form.display_name}
                onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                className="w-full bg-bg-elevated border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-accent transition-colors"
                placeholder="홍길동"
              />
              <p className="text-xs text-muted mt-1">프로필에 표시되는 이름입니다 (중복 허용)</p>
            </div>
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
              <p className="text-xs text-muted mt-1">고유한 ID입니다 (영문·숫자·_·. 2~30자, 중복 불가)</p>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1.5">비밀번호</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full bg-bg-elevated border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-accent transition-colors"
                placeholder="8자 이상"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1.5">비밀번호 확인</label>
              <input
                type="password"
                required
                value={form.confirm}
                onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
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
              {loading ? "가입 중..." : "회원가입"}
            </button>
          </form>

          <p className="text-center text-xs text-muted mt-6">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="text-accent hover:underline">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
