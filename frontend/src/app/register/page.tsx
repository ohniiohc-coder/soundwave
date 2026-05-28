"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Check, X, Loader } from "lucide-react";

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ display_name: "", username: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const USERNAME_RE = /^[a-zA-Z0-9_.]+$/;

  useEffect(() => {
    const u = form.username;
    if (!u) { setUsernameStatus("idle"); return; }
    if (u.length < 2 || u.length > 30 || !USERNAME_RE.test(u)) {
      setUsernameStatus("invalid");
      return;
    }
    setUsernameStatus("checking");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const { available } = await api.checkUsername(u);
        setUsernameStatus(available ? "available" : "taken");
      } catch {
        setUsernameStatus("idle");
      }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [form.username]);

  const validate = () => {
    if (!form.display_name.trim()) return "이름을 입력해 주세요";
    if (usernameStatus === "invalid") return "사용자 이름은 영문·숫자·_·. 2~30자여야 합니다";
    if (usernameStatus === "taken") return "이미 사용 중인 사용자 이름입니다";
    if (usernameStatus === "checking") return "사용자 이름 확인 중입니다";
    if (form.password.length < 8) return "비밀번호는 8자 이상이어야 합니다";
    if (form.password !== form.confirm) return "비밀번호가 일치하지 않습니다";
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
    } catch {
      setError("회원가입에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  const usernameInputStyle = {
    idle: "border-border",
    checking: "border-border",
    available: "border-[rgba(200,255,0,0.5)]",
    taken: "border-red-500/50",
    invalid: "border-red-500/50",
  }[usernameStatus];

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center mb-8">
          <span
            className="text-2xl text-white/90 leading-none"
            style={{ fontFamily: "var(--font-playfair, 'Playfair Display', Georgia, serif)", letterSpacing: "-0.02em" }}
          >
            whatpl<span className="text-accent">.</span>
          </span>
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
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm select-none">@</span>
                <input
                  type="text"
                  required
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.toLowerCase() }))}
                  className={`w-full bg-bg-elevated border rounded-lg pl-8 pr-9 py-2.5 text-sm outline-none transition-colors ${usernameInputStyle}`}
                  placeholder="username"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  {usernameStatus === "checking" && (
                    <Loader size={14} className="animate-spin" style={{ color: "rgba(255,255,255,0.3)" }} />
                  )}
                  {usernameStatus === "available" && (
                    <Check size={14} style={{ color: "#c8ff00" }} />
                  )}
                  {(usernameStatus === "taken" || usernameStatus === "invalid") && (
                    <X size={14} className="text-red-400" />
                  )}
                </span>
              </div>
              <p className="text-xs mt-1" style={{
                color: usernameStatus === "available" ? "rgba(200,255,0,0.7)"
                  : (usernameStatus === "taken" || usernameStatus === "invalid") ? "rgba(248,113,113,0.8)"
                  : "rgba(255,255,255,0.35)"
              }}>
                {usernameStatus === "available" && "사용 가능한 아이디입니다"}
                {usernameStatus === "taken" && "사용할 수 없는 아이디입니다"}
                {usernameStatus === "invalid" && "영문·숫자·_·. 2~30자여야 합니다"}
                {(usernameStatus === "idle" || usernameStatus === "checking") && "고유한 ID입니다 (영문·숫자·_·. 2~30자, 중복 불가)"}
              </p>
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
                className={`w-full bg-bg-elevated border rounded-lg px-4 py-2.5 text-sm outline-none transition-colors ${
                  form.confirm && form.confirm !== form.password ? "border-red-500/50" :
                  form.confirm && form.confirm === form.password ? "border-[rgba(200,255,0,0.5)]" :
                  "border-border"
                }`}
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-red-400 text-xs text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading || usernameStatus === "taken" || usernameStatus === "checking"}
              className="w-full bg-accent text-black font-semibold py-2.5 rounded-lg text-sm hover:bg-accent-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "가입 중..." : "회원가입"}
            </button>
          </form>

          <p className="text-center text-xs text-muted mt-6">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="text-accent hover:underline">로그인</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
