"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, Playlist } from "@/lib/api";
import { ListMusic, Plus } from "lucide-react";

export default function PlaylistsPage() {
  const router = useRouter();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    api.getPlaylists().then(setPlaylists).catch(() => {});
  }, []);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      const pl = await api.createPlaylist(name);
      router.push(`/playlists/${pl.id}`);
    } catch {}
  };

  return (
    <div className="p-6 md:p-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">플레이리스트</h1>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent rounded-full text-black text-sm font-semibold hover:bg-accent-light transition-colors"
        >
          <Plus size={15} />새 플레이리스트
        </button>
      </div>

      {creating && (
        <div className="mb-6">
          <input
            autoFocus
            type="text"
            placeholder="플레이리스트 이름 입력 후 Enter"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") { setCreating(false); setNewName(""); }
            }}
            className="w-full max-w-sm bg-bg-panel border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-accent transition-colors"
          />
        </div>
      )}

      {playlists.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 gap-3 rounded-xl bg-bg-panel border border-border">
          <ListMusic size={32} className="text-muted" />
          <p className="text-muted text-sm">플레이리스트가 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {playlists.map((pl) => (
            <button
              key={pl.id}
              onClick={() => router.push(`/playlists/${pl.id}`)}
              className="flex flex-col gap-3 p-3 rounded-xl bg-bg-panel hover:bg-bg-elevated transition-colors text-left"
            >
              <div className="aspect-square rounded-lg bg-bg-elevated flex items-center justify-center">
                <ListMusic size={36} className="text-muted" />
              </div>
              <div>
                <p className="text-sm font-medium truncate">{pl.name}</p>
                <p className="text-xs text-muted mt-0.5">{pl.track_count}곡</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
