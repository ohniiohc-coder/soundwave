"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Camera, Check, ArrowLeft, Lock, Unlock } from "lucide-react";
import { AvatarCropModal } from "@/components/AvatarCropModal";

export default function SettingsPage() {
  const router = useRouter();
  const { user, setUser, initialized } = useAuthStore();

  const [form, setForm] = useState({ display_name: "", bio: "" });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!initialized) return;
    if (!user) { router.replace("/login"); return; }
    setForm({ display_name: user.display_name, bio: user.bio ?? "" });
  }, [initialized, user?.id]);

  if (!initialized || !user) return null;

  const currentAvatar = avatarPreview ?? user.avatar_url;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropImageSrc(URL.createObjectURL(file));
    e.target.value = "";
  };

  const handleCropConfirm = (blob: Blob) => {
    const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(URL.createObjectURL(blob));
    setAvatarFile(file);
    if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
    setCropImageSrc(null);
  };

  const handleCropClose = () => {
    if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
    setCropImageSrc(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let updatedUser = user;

      if (avatarFile) {
        const res = await api.uploadAvatar(avatarFile);
        updatedUser = { ...updatedUser, avatar_url: res.avatar_url };
        if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        setAvatarFile(null);
        setAvatarPreview(null);
      }

      const profileRes = await api.updateProfile({
        display_name: form.display_name.trim() || user.display_name,
        bio: form.bio,
      });
      updatedUser = { ...updatedUser, ...profileRes };

      setUser(updatedUser);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert("저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const togglePrivate = async () => {
    try {
      const updated = await api.updateProfile({ is_private: !user.is_private });
      setUser({ ...user, ...updated });
    } catch {
      alert("설정 변경 실패");
    }
  };

  const initials = user.display_name.slice(0, 2).toUpperCase();

  return (
    <>
      {cropImageSrc && (
        <AvatarCropModal
          imageSrc={cropImageSrc}
          onConfirm={handleCropConfirm}
          onClose={handleCropClose}
        />
      )}

      <div className="p-8 md:p-10 max-w-lg">
        {/* 헤더 */}
        <div className="flex items-center gap-4 mb-10">
          <Link
            href={`/users/${user.username}`}
            className="flex items-center justify-center w-8 h-8 rounded-full transition-colors"
            style={{ color: "rgba(255,255,255,0.4)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.9)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-lg font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>프로필 편집</h1>
        </div>

        <div className="space-y-8">
          {/* 아바타 */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="relative w-24 h-24 rounded-full overflow-hidden flex items-center justify-center"
                style={{ border: "2px solid rgba(255,255,255,0.08)", background: "#111" }}>
                {currentAvatar ? (
                  <Image src={currentAvatar} alt={user.display_name} fill className="object-cover" sizes="96px" />
                ) : (
                  <span
                    className="select-none"
                    style={{
                      fontFamily: "var(--font-playfair, 'Playfair Display', Georgia, serif)",
                      fontSize: "38px",
                      color: "rgba(255,255,255,0.12)",
                    }}
                  >
                    {initials}
                  </span>
                )}
              </div>
              <div className="absolute inset-0 rounded-full flex flex-col items-center justify-center gap-1 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={18} className="text-white" />
                <span className="text-[10px] text-white">변경</span>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            {avatarPreview && (
              <button
                onClick={() => { if (avatarPreview) URL.revokeObjectURL(avatarPreview); setAvatarPreview(null); setAvatarFile(null); }}
                className="text-[11px] transition-colors"
                style={{ color: "rgba(255,255,255,0.3)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
              >
                미리보기 취소
              </button>
            )}
          </div>

          {/* 폼 */}
          <div className="space-y-5">
            {/* 사용자명 (읽기 전용) */}
            <div>
              <label className="block text-[11px] uppercase tracking-[0.1em] mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>
                사용자 이름
              </label>
              <div
                className="w-full px-4 py-2.5 rounded-xl text-sm"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.25)",
                }}
              >
                @{user.username}
              </div>
            </div>

            {/* 표시 이름 */}
            <div>
              <label className="block text-[11px] uppercase tracking-[0.1em] mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>
                표시 이름
              </label>
              <input
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-colors"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.9)",
                }}
                value={form.display_name}
                onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,255,0,0.4)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
                maxLength={100}
              />
            </div>

            {/* 소개 */}
            <div>
              <label className="block text-[11px] uppercase tracking-[0.1em] mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>
                소개
              </label>
              <textarea
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-colors resize-none"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.9)",
                }}
                rows={3}
                placeholder="자기소개를 입력하세요"
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,255,0,0.4)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
                maxLength={300}
              />
            </div>

            {/* 계정 공개 여부 */}
            <div
              className="flex items-center justify-between px-4 py-3 rounded-xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>비공개 계정</p>
                <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                  팔로워만 내 플레이리스트를 볼 수 있습니다
                </p>
              </div>
              <button
                onClick={togglePrivate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] transition-all flex-shrink-0"
                style={user.is_private ? {
                  border: "1px solid rgba(200,255,0,0.3)",
                  color: "rgba(200,255,0,0.8)",
                  background: "rgba(200,255,0,0.06)",
                } : {
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.4)",
                  background: "transparent",
                }}
              >
                {user.is_private ? <Lock size={10} /> : <Unlock size={10} />}
                {user.is_private ? "비공개" : "공개"}
              </button>
            </div>
          </div>

          {/* 저장 버튼 */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={saved ? {
              background: "rgba(200,255,0,0.12)",
              border: "1px solid rgba(200,255,0,0.3)",
              color: "#c8ff00",
            } : {
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.85)",
            }}
          >
            {saved && <Check size={14} />}
            {saving ? "저장 중..." : saved ? "저장됨" : "저장"}
          </button>
        </div>
      </div>
    </>
  );
}
