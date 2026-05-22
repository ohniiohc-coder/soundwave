"use client";
import { useState, useEffect, useRef } from "react";
import { ListPlus, Check, Plus } from "lucide-react";
import { api, Playlist } from "@/lib/api";

type Props = { trackId: string };

export function AddToPlaylistButton({ trackId }: Props) {
  const [open, setOpen] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    api.getPlaylists().then(setPlaylists).catch(() => {});
  }, [open]);

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleAdd = async (playlistId: string) => {
    try {
      await api.addTrackToPlaylist(playlistId, trackId);
      setAdded((prev) => new Set(prev).add(playlistId));
    } catch {}
  };

  const handleCreateAndAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      const pl = await api.createPlaylist(name);
      await api.addTrackToPlaylist(pl.id, trackId);
      setPlaylists((prev) => [pl, ...prev]);
      setAdded((prev) => new Set(prev).add(pl.id));
      setCreatingNew(false);
      setNewName("");
    } catch {}
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="p-1 rounded opacity-0 group-hover:opacity-100 text-muted hover:text-accent transition-all"
        title="플레이리스트에 추가"
      >
        <ListPlus size={15} />
      </button>

      {open && (
        <div
          className="absolute right-0 bottom-8 z-50 w-52 bg-bg-elevated border border-border rounded-xl shadow-2xl py-1 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs text-muted px-3 py-2 border-b border-border">플레이리스트에 추가</p>

          {creatingNew ? (
            <div className="px-3 py-2">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateAndAdd();
                  if (e.key === "Escape") { setCreatingNew(false); setNewName(""); }
                }}
                placeholder="이름 입력 후 Enter"
                className="w-full bg-bg-panel border border-border rounded px-2 py-1 text-xs outline-none focus:border-accent"
              />
            </div>
          ) : (
            <button
              onClick={() => setCreatingNew(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted hover:text-white hover:bg-bg-hover transition-colors"
            >
              <Plus size={13} />새 플레이리스트
            </button>
          )}

          <div className="max-h-40 overflow-y-auto">
            {playlists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => handleAdd(pl.id)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-bg-hover transition-colors"
              >
                <span className="truncate text-left">{pl.name}</span>
                {added.has(pl.id) && <Check size={13} className="text-accent flex-shrink-0" />}
              </button>
            ))}
            {playlists.length === 0 && !creatingNew && (
              <p className="text-xs text-muted px-3 py-2">플레이리스트가 없습니다</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
