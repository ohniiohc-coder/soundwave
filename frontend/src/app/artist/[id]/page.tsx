"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { api, ArtistDetail } from "@/lib/api";
import { AlbumCard } from "@/components/AlbumCard";
import { useAuthStore } from "@/store/authStore";
import { Mic2, Pencil, Check, X, Camera, Trash2 } from "lucide-react";

export default function ArtistPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";
  const [artist, setArtist] = useState<ArtistDetail | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "" });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.getArtist(id).then(setArtist).catch(console.error);
  }, [id]);

  useEffect(() => {
    if (artist) setForm({ name: artist.name });
  }, [artist]);

  const handleSave = async () => {
    if (!artist) return;
    try {
      const updated = await api.updateArtist(artist.id, { name: form.name });
      setArtist((prev) => prev ? { ...prev, ...updated } : null);
      setEditing(false);
    } catch {
      alert("저장 실패");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !artist) return;
    try {
      const updated = await api.uploadArtistImage(artist.id, file);
      setArtist((prev) => prev ? { ...prev, image_url: updated.image_url } : null);
    } catch {
      alert("이미지 업로드 실패");
    }
    e.target.value = "";
  };

  const handleDeleteArtist = async () => {
    if (!artist) return;
    const albumCount = artist.albums.length;
    let msg = `아티스트 "${artist.name}"을 삭제합니다.`;
    if (albumCount > 0) msg += `\n앨범 ${albumCount}개 및 포함된 모든 곡도 함께 삭제됩니다.`;
    msg += "\n\n계속할까요?";
    if (!window.confirm(msg)) return;
    setDeleting(true);
    try {
      await api.deleteArtist(artist.id);
      window.location.href = "/artists";
    } catch {
      alert("삭제 실패");
      setDeleting(false);
    }
  };

  if (!artist) {
    return <div className="flex items-center justify-center h-64 text-muted">로딩 중...</div>;
  }

  return (
    <div className="min-h-full">
      {/* 아티스트 헤더 */}
      <div className="relative p-8 md:p-10">
        <div
          className="absolute inset-0 opacity-15 blur-3xl -z-0"
          style={{ background: "radial-gradient(circle at 20% 50%, #c9a96e 0%, transparent 60%)" }}
        />
        <div className="relative flex gap-8 items-center">

          {/* 프로필 이미지 */}
          <div className="relative w-36 h-36 rounded-full overflow-hidden bg-bg-elevated flex-shrink-0 shadow-xl group">
            {artist.image_url ? (
              <Image src={artist.image_url} alt={artist.name} width={144} height={144} className="object-cover w-full h-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Mic2 size={48} className="text-muted" />
              </div>
            )}
            {isAdmin && (
              <label className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera size={20} className="text-white" />
                <span className="text-xs text-white">사진 변경</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            )}
          </div>

          {/* 아티스트 정보 */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted uppercase tracking-widest mb-2">아티스트</p>
            {editing && isAdmin ? (
              <div className="space-y-2">
                <input
                  className="bg-bg-elevated border border-border rounded px-3 py-1.5 text-sm w-full"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
                <div className="flex gap-2 items-center">
                  <button onClick={handleSave} className="p-1.5 rounded bg-accent text-black hover:bg-accent-light">
                    <Check size={14} />
                  </button>
                  <button onClick={() => setEditing(false)} className="p-1.5 rounded bg-bg-elevated hover:bg-bg-hover">
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-4xl font-bold mb-2">{artist.name}</h1>
                <p className="text-xs text-muted">{artist.albums.length}개 앨범</p>
              </>
            )}

            {!editing && isAdmin && (
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={() => setEditing(true)}
                  className="p-2.5 rounded-full bg-bg-elevated hover:bg-bg-hover transition-colors text-muted hover:text-white"
                  title="이름 편집"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={handleDeleteArtist}
                  disabled={deleting}
                  className="p-2.5 rounded-full bg-bg-elevated hover:bg-red-500/20 transition-colors text-muted hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="아티스트 삭제"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 앨범 목록 */}
      <div className="px-8 md:px-10 pb-10">
        <h2 className="text-lg font-semibold mb-5">앨범</h2>
        {artist.albums.length === 0 ? (
          <p className="text-muted text-sm">이 아티스트의 앨범이 없습니다.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {artist.albums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
