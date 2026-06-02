"use client";
import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { X, Music2, Play, Pause, GripVertical, Trash2, ListMusic, ChevronDown, Check, Disc3 } from "lucide-react";
import { usePlayerStore } from "@/store/playerStore";
import { api, Playlist, PlaylistDetail, AlbumDetail } from "@/lib/api";
import clsx from "clsx";

function formatDuration(secs: number | null): string {
  if (!secs) return "--:--";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function QueuePanel() {
  const {
    queue, currentIndex, isPlaying, isQueueOpen,
    contextTracks, contextIndex, contextType, activeContextId,
    toggleQueue, jumpTo, pause, play, reorderQueue, removeFromQueue,
    playContext, jumpToInContext, reorderContext, removeFromContext,
  } = usePlayerStore();

  const [recentContexts, setRecentContexts] = useState<{ context_type: string; context_id: string; context_name: string }[]>([]);

  const [tab, setTab] = useState<"queue" | "context">("queue");

  // 플레이리스트 탭 - 플레이리스트 목록/선택
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PlaylistDetail | null>(null);
  const [showSelector, setShowSelector] = useState(false);

  // 큐 드래그
  const dragFrom = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  // 컨텍스트 드래그
  const ctxDragFrom = useRef<number | null>(null);
  const [ctxDragOver, setCtxDragOver] = useState<number | null>(null);

  // 패널 열릴 때 컨텍스트 있으면 컨텍스트 탭으로
  useEffect(() => {
    if (!isQueueOpen) return;
    if (contextType) {
      setTab("context");
      if (contextType === "playlist" && activeContextId) setSelectedId(activeContextId);
    } else {
      setTab("queue");
    }
    // 최근 컨텍스트 목록 DB에서 갱신
    api.getRecentContexts().then(setRecentContexts).catch(() => {});
  }, [isQueueOpen, contextType, activeContextId]);

  // 플레이리스트 목록 로드
  useEffect(() => {
    if (tab !== "context") return;
    api.getPlaylists().then((list) => {
      setPlaylists(list);
      if (list.length > 0 && !selectedId) setSelectedId(list[0].id);
    }).catch(() => {});
  }, [tab]);

  // 선택된 플레이리스트 상세 로드 + DB 이름 업데이트
  useEffect(() => {
    if (contextType === "album") return;
    if (!selectedId) return;
    api.getPlaylist(selectedId).then((pl) => {
      setDetail(pl);
      // DB recent_contexts의 이름을 실제 플레이리스트 이름으로 갱신
      api.upsertRecentContext("playlist", selectedId, pl.name).then(() =>
        api.getRecentContexts().then(setRecentContexts)
      ).catch(() => {});
    }).catch(() => {});
  }, [selectedId, contextType]);

  if (!isQueueOpen) return null;

  // 드래그 핸들러
  const handleDragStart = (e: React.DragEvent, i: number) => {
    dragFrom.current = i;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(i));
  };
  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(i);
  };
  const handleDrop = (e: React.DragEvent, to: number) => {
    e.preventDefault();
    if (dragFrom.current !== null && dragFrom.current !== to) reorderQueue(dragFrom.current, to);
    dragFrom.current = null;
    setDragOver(null);
  };


  // 컨텍스트 탭 헤더 텍스트
  const contextHeaderName = contextType === "album"
    ? (contextTracks[0]?.albumTitle ?? "앨범")
    : (playlists.find((p) => p.id === selectedId)?.name ?? "플레이리스트 선택");

  const contextHeaderCount = contextType === "album"
    ? contextTracks.length
    : (playlists.find((p) => p.id === selectedId)?.track_count ?? 0);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={toggleQueue} />

      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col bg-bg-panel border-l border-border shadow-2xl"
        style={{ width: "340px" }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <h2 className="font-semibold text-sm">재생목록</h2>
          <button onClick={toggleQueue} className="p-1.5 rounded-lg hover:bg-bg-hover text-muted hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-border flex-shrink-0">
          {(["queue", "context"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                "flex-1 py-2.5 text-sm font-medium transition-colors",
                tab === t ? "text-accent border-b-2 border-accent" : "text-muted hover:text-white"
              )}
            >
              {t === "queue" ? "노래" : "플레이리스트"}
            </button>
          ))}
        </div>

        {/* ── 노래 탭 ──────────────────────────────────────────────────────── */}
        {tab === "queue" && (
          <>
            <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 flex-shrink-0">
              <span className="font-semibold text-sm">전체</span>
              <span className="text-accent font-semibold text-sm">{queue.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {queue.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3 text-muted">
                  <Music2 size={32} /><p className="text-sm">재생 대기열이 비어 있습니다</p>
                </div>
              ) : queue.map((track, i) => {
                const isActive = i === currentIndex && !contextType;
                return (
                  <div
                    key={`${track.id}-${i}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, i)}
                    onDragOver={(e) => handleDragOver(e, i)}
                    onDrop={(e) => handleDrop(e, i)}
                    onDragEnd={() => { dragFrom.current = null; setDragOver(null); }}
                    className={clsx(
                      "flex items-center gap-2 px-3 py-2.5 transition-colors group select-none",
                      isActive ? "bg-bg-elevated" : "hover:bg-bg-hover",
                      dragOver === i && "border-t-2 border-accent"
                    )}
                  >
                    <div className="flex-shrink-0 cursor-grab active:cursor-grabbing text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                      <GripVertical size={14} />
                    </div>
                    <div
                      className="relative w-10 h-10 rounded overflow-hidden bg-bg-elevated flex-shrink-0 cursor-pointer"
                      onClick={() => { if (isActive) { isPlaying ? pause() : play(); } else jumpTo(i); }}
                    >
                      {track.coverUrl
                        ? <Image src={track.coverUrl} alt="" fill className="object-cover" sizes="40px" />
                        : <div className="w-full h-full flex items-center justify-center"><Music2 size={14} className="text-muted" /></div>
                      }
                      {isActive && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          {isPlaying ? <Pause size={12} fill="white" className="text-white" /> : <Play size={12} fill="white" className="text-white ml-0.5" />}
                        </div>
                      )}
                    </div>
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => { if (isActive) { isPlaying ? pause() : play(); } else jumpTo(i); }}
                    >
                      <p className={clsx("text-sm truncate", isActive ? "text-accent font-medium" : "text-white")}>{track.title}</p>
                      <p className="text-xs text-muted truncate">{track.artistName || track.albumTitle || ""}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-xs text-muted">{formatDuration(track.duration_seconds)}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFromQueue(i); }}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:text-red-400 text-muted transition-all"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── 컨텍스트 탭 (앨범 or 플레이리스트) ─────────────────────────── */}
        {tab === "context" && (
          <>
            {/* 컨텍스트 헤더 — 앨범/플레이리스트 모두 동일한 드롭다운 */}
            <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 flex-shrink-0">
              <div className="relative flex-1">
                <button
                  onClick={() => setShowSelector((s) => !s)}
                  className="flex items-center gap-1.5 text-sm font-semibold hover:text-accent transition-colors"
                >
                  <span className="truncate max-w-[160px]">{contextHeaderName}</span>
                  <span className="text-accent font-semibold">{contextHeaderCount}</span>
                  <ChevronDown size={14} className="text-muted flex-shrink-0" />
                </button>

                {showSelector && (
                  <div className="absolute left-0 top-8 z-10 w-56 bg-bg-elevated border border-border rounded-xl shadow-2xl py-1 overflow-hidden">
                    {recentContexts.length === 0 ? (
                      <p className="text-xs text-muted px-3 py-2">최근 재생한 항목이 없습니다</p>
                    ) : recentContexts.map((ctx) => (
                      <button
                        key={ctx.context_id}
                        onClick={async () => {
                          setShowSelector(false);
                          if (ctx.context_type === "album") {
                            try {
                              const d = await api.getAlbum(ctx.context_id);
                              const tracks = d.tracks.map((t) => ({
                                ...t,
                                albumTitle: d.title,
                                artistName: d.artist?.name,
                                coverUrl: d.cover_art_url ?? undefined,
                              }));
                              playContext("album", ctx.context_id, tracks, 0);
                            } catch {}
                          } else {
                            try {
                              const pl = await api.getPlaylist(ctx.context_id);
                              const tracks = pl.items.map((i) => ({
                                ...i.track,
                                albumTitle: i.album_title ?? undefined,
                                artistName: i.artist_name ?? undefined,
                                coverUrl: i.cover_art_url ?? undefined,
                              }));
                              setDetail(pl);
                              setSelectedId(ctx.context_id);
                              playContext("playlist", ctx.context_id, tracks, 0);
                            } catch {}
                          }
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-bg-hover transition-colors"
                      >
                        {ctx.context_type === "album"
                          ? <Disc3 size={13} className="text-muted flex-shrink-0" />
                          : <ListMusic size={13} className="text-muted flex-shrink-0" />
                        }
                        <span className="truncate flex-1 text-left">{ctx.context_name}</span>
                        {ctx.context_id === activeContextId && <Check size={13} className="text-accent flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 트랙 목록 */}
            <div className="flex-1 overflow-y-auto py-2">
              {/* 앨범 컨텍스트 */}
              {contextType === "album" && (
                contextTracks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 gap-3 text-muted">
                    <Disc3 size={32} /><p className="text-sm">앨범 트랙이 없습니다</p>
                  </div>
                ) : contextTracks.map((track, i) => {
                  const isActive = i === contextIndex && contextType === "album";
                  return (
                    <div
                      key={`${track.id}-${i}`}
                      draggable
                      onDragStart={(e) => { ctxDragFrom.current = i; e.dataTransfer.effectAllowed = "move"; }}
                      onDragOver={(e) => { e.preventDefault(); setCtxDragOver(i); }}
                      onDrop={(e) => { e.preventDefault(); if (ctxDragFrom.current !== null && ctxDragFrom.current !== i) reorderContext(ctxDragFrom.current, i); ctxDragFrom.current = null; setCtxDragOver(null); }}
                      onDragEnd={() => { ctxDragFrom.current = null; setCtxDragOver(null); }}
                      className={clsx(
                        "flex items-center gap-2 px-3 py-2.5 transition-colors group cursor-pointer select-none",
                        isActive ? "bg-bg-elevated" : "hover:bg-bg-hover",
                        ctxDragOver === i && "border-t-2 border-accent"
                      )}
                      onClick={() => {
                        if (isActive) { isPlaying ? pause() : play(); }
                        else jumpToInContext(i);
                      }}
                    >
                      <div className="flex-shrink-0 cursor-grab active:cursor-grabbing text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripVertical size={14} />
                      </div>
                      <div className="relative w-10 h-10 rounded overflow-hidden bg-bg-elevated flex-shrink-0">
                        {track.coverUrl
                          ? <Image src={track.coverUrl} alt="" fill className="object-cover" sizes="40px" />
                          : <div className="w-full h-full flex items-center justify-center"><Music2 size={14} className="text-muted" /></div>
                        }
                        {isActive && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            {isPlaying ? <Pause size={12} fill="white" className="text-white" /> : <Play size={12} fill="white" className="text-white ml-0.5" />}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={clsx("text-sm truncate", isActive ? "text-accent font-medium" : "text-white")}>{track.title}</p>
                        <p className="text-xs text-muted truncate">{track.artistName || ""}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-xs text-muted">{formatDuration(track.duration_seconds)}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFromContext(i); }}
                          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:text-red-400 text-muted transition-all"
                          title="대기열에서 제거"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}

              {/* 플레이리스트 컨텍스트 */}
              {contextType !== "album" && (() => {
                // 이 플레이리스트가 현재 재생 중이면 스토어의 contextTracks 사용 (순서 변경 반영)
                // 아니면 API에서 받은 detail.items 사용
                const isActivePlaylist = contextType === "playlist" && activeContextId === detail?.id;
                const rows: { key: string; title: string; artistName: string; coverUrl?: string; duration: number | null; trackId: string }[] =
                  isActivePlaylist
                    ? contextTracks.map((t, i) => ({
                        key: `ctx-${t.id}-${i}`,
                        title: t.title,
                        artistName: t.artistName || t.albumTitle || "",
                        coverUrl: t.coverUrl,
                        duration: t.duration_seconds,
                        trackId: t.id,
                      }))
                    : (detail?.items ?? []).map((item, i) => ({
                        key: item.id,
                        title: item.track.title,
                        artistName: item.artist_name || item.album_title || "",
                        coverUrl: item.cover_art_url ?? undefined,
                        duration: item.track.duration_seconds,
                        trackId: item.track.id,
                      }));

                if (rows.length === 0) return (
                  <div className="flex flex-col items-center justify-center h-40 gap-3 text-muted">
                    <ListMusic size={32} /><p className="text-sm">트랙을 추가해보세요</p>
                  </div>
                );

                return rows.map((row, idx) => {
                  const isActive = isActivePlaylist && contextIndex === idx;
                  const allTracks = isActivePlaylist ? contextTracks : (detail?.items ?? []).map((i) => ({
                    ...i.track, albumTitle: i.album_title ?? undefined, artistName: i.artist_name ?? undefined, coverUrl: i.cover_art_url ?? undefined,
                  }));
                  return (
                    <div
                      key={row.key}
                      draggable
                      onDragStart={(e) => { ctxDragFrom.current = idx; e.dataTransfer.effectAllowed = "move"; }}
                      onDragOver={(e) => { e.preventDefault(); setCtxDragOver(idx); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const from = ctxDragFrom.current;
                        if (from !== null && from !== idx) {
                          reorderContext(from, idx);
                          // 플레이리스트 모드면 DB에도 저장
                          if (contextType === "playlist" && activeContextId && detail) {
                            const nextItems = [...detail.items];
                            const [movedItem] = nextItems.splice(from, 1);
                            nextItems.splice(idx, 0, movedItem);
                            setDetail((d) => d ? { ...d, items: nextItems } : null);
                            api.reorderPlaylist(activeContextId, nextItems.map((i) => i.id)).catch(() => {});
                          }
                        }
                        ctxDragFrom.current = null;
                        setCtxDragOver(null);
                      }}
                      onDragEnd={() => { ctxDragFrom.current = null; setCtxDragOver(null); }}
                      className={clsx(
                        "flex items-center gap-2 px-3 py-2.5 transition-colors group cursor-pointer select-none",
                        isActive ? "bg-bg-elevated" : "hover:bg-bg-hover",
                        ctxDragOver === idx && "border-t-2 border-accent"
                      )}
                      onClick={() => {
                        if (isActive) { isPlaying ? pause() : play(); }
                        else if (isActivePlaylist) { jumpToInContext(idx); }
                        else if (detail) { playContext("playlist", detail.id, allTracks as any, idx); }
                      }}
                    >
                      <div className="flex-shrink-0 cursor-grab active:cursor-grabbing text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripVertical size={14} />
                      </div>
                      <div className="relative w-10 h-10 rounded overflow-hidden bg-bg-elevated flex-shrink-0">
                        {row.coverUrl
                          ? <Image src={row.coverUrl} alt="" fill className="object-cover" sizes="40px" />
                          : <div className="w-full h-full flex items-center justify-center"><Music2 size={14} className="text-muted" /></div>
                        }
                        {isActive && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            {isPlaying ? <Pause size={12} fill="white" className="text-white" /> : <Play size={12} fill="white" className="text-white ml-0.5" />}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={clsx("text-sm truncate", isActive ? "text-accent font-medium" : "text-white")}>{row.title}</p>
                        <p className="text-xs text-muted truncate">{row.artistName}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-xs text-muted">{formatDuration(row.duration)}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromContext(idx);
                            // 플레이리스트 컨텍스트일 때만 DB에도 반영
                            if (contextType === "playlist" && activeContextId && detail) {
                              const itemId = detail.items[idx]?.id;
                              if (itemId) {
                                api.removePlaylistItem(activeContextId, itemId).catch(() => {});
                                setDetail((d) => {
                                  if (!d) return null;
                                  const items = [...d.items.slice(0, idx), ...d.items.slice(idx + 1)];
                                  return { ...d, items, track_count: d.track_count - 1 };
                                });
                              }
                            }
                          }}
                          className="p-1 rounded opacity-0 group-hover:opacity-100 text-muted hover:text-red-400 transition-all"
                          title="대기열에서 제거"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </>
        )}
      </div>
    </>
  );
}
