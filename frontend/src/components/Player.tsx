"use client";
import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { usePlayerStore, PlayerTrack } from "@/store/playerStore";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, ListMusic, Shuffle, Repeat } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

function formatTime(secs: number): string {
  if (!secs || isNaN(secs)) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function Player() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipSave = useRef(true);
  const router = useRouter();
  const { user, initialized } = useAuthStore();

  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [hovering, setHovering] = useState(false);

  const {
    currentTrack, isPlaying, volume, progress, duration, isQueueOpen,
    toggle, next, prev, setQueue, pause: pauseStore,
    setVolume, setProgress, setDuration, toggleQueue,
    queue, contextType, activeContextId, contextTracks, contextPlayKey,
  } = usePlayerStore();

  useEffect(() => {
    api.getQueue().then((pl) => {
      if (!pl.items.length) { skipSave.current = false; return; }
      const tracks: PlayerTrack[] = pl.items.map((item) => ({
        ...item.track,
        albumTitle: item.album_title ?? undefined,
        artistName: item.artist_name ?? undefined,
        coverUrl: item.cover_art_url ?? undefined,
      }));
      setQueue(tracks, 0);
      pauseStore();
      setTimeout(() => { skipSave.current = false; }, 300);
    }).catch(() => { skipSave.current = false; });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!initialized) return;
    if (isPlaying && !user) { pauseStore(); router.push("/login"); }
  }, [isPlaying, user, initialized]);

  useEffect(() => {
    if (!activeContextId || !contextType) return;
    const name = contextType === "album" ? (contextTracks[0]?.albumTitle ?? "") : activeContextId;
    if (!name) return;
    api.upsertRecentContext(contextType, activeContextId, name).catch(() => {});
  }, [activeContextId, contextType]);

  useEffect(() => {
    if (skipSave.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      api.saveQueue(queue.map((t) => t.id)).catch(() => {});
    }, 1000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [queue]);

  const track = currentTrack();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    const src = api.streamUrl(track.id);
    if (audio.src !== src) { audio.src = src; audio.load(); }
    if (isPlaying) audio.play().catch(() => {});
  }, [track?.id]);

  useEffect(() => {
    if (contextPlayKey === 0) return;
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    setProgress(0);
    audio.play().catch(() => {});
  }, [contextPlayKey]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.play().catch(() => {});
    else audio.pause();
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const onTimeUpdate = useCallback(() => {
    if (audioRef.current) setProgress(audioRef.current.currentTime);
  }, [setProgress]);

  const onLoadedMetadata = useCallback(() => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  }, [setDuration]);

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    setProgress(t);
    if (audioRef.current) audioRef.current.currentTime = t;
  };

  const progressPct = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <>
      <audio ref={audioRef} onTimeUpdate={onTimeUpdate} onLoadedMetadata={onLoadedMetadata} onEnded={next} />

      <div
        className="fixed z-[60] flex flex-col overflow-hidden"
        style={{
          bottom: 19,
          left: "50%",
          transform: "translateX(-50%)",
          width: 578,
          height: 60,
          borderRadius: 36,
          background: "rgba(38,38,38,0.95)",
          backdropFilter: "blur(32px) saturate(180%)",
          WebkitBackdropFilter: "blur(32px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06) inset",
        }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        {/* 컨트롤 행 */}
        <div className="flex items-center flex-1 px-5">

          {/* 왼쪽: 재생 컨트롤 */}
          <div className="flex items-center gap-3.5 flex-1">
            <button
              onClick={() => setShuffle(s => !s)}
              style={{ color: shuffle ? "#c8ff00" : "rgba(255,255,255,0.4)" }}
              className="transition-colors hover:brightness-125"
            >
              <Shuffle size={14} />
            </button>
            <button
              onClick={prev}
              style={{ color: "rgba(255,255,255,0.75)" }}
              className="transition-all hover:text-white"
            >
              <SkipBack size={18} fill="currentColor" />
            </button>
            <button
              onClick={toggle}
              className="flex items-center justify-center transition-transform hover:scale-105 active:scale-95 flex-shrink-0"
              style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "rgba(255,255,255,0.95)",
              }}
            >
              {isPlaying
                ? <Pause size={14} fill="black" color="black" />
                : <Play size={14} fill="black" color="black" style={{ marginLeft: 2 }} />}
            </button>
            <button
              onClick={next}
              style={{ color: "rgba(255,255,255,0.75)" }}
              className="transition-all hover:text-white"
            >
              <SkipForward size={18} fill="currentColor" />
            </button>
            <button
              onClick={() => setRepeat(r => !r)}
              style={{ color: repeat ? "#c8ff00" : "rgba(255,255,255,0.4)" }}
              className="transition-colors hover:brightness-125"
            >
              <Repeat size={14} />
            </button>
          </div>

          {/* 오른쪽: 큐 + 볼륨 */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleQueue}
              style={{ color: isQueueOpen ? "#c8ff00" : "rgba(255,255,255,0.45)" }}
              className="transition-colors hover:brightness-125"
              title="재생 대기열"
            >
              <ListMusic size={15} />
            </button>
            <button
              onClick={() => setVolume(volume > 0 ? 0 : 0.8)}
              style={{ color: "rgba(255,255,255,0.45)" }}
              className="transition-colors hover:text-white"
            >
              {volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
          </div>
        </div>

        {/* 하단 progress 라인 */}
        <div className="flex-shrink-0 relative" style={{ height: 3 }}>
          {/* 시각적 트랙 */}
          <div className="absolute inset-0" style={{ background: "rgba(255,255,255,0.07)" }}>
            <div className="h-full transition-none" style={{ width: `${progressPct}%`, background: "#c8ff00", opacity: 0.8 }} />
          </div>
          {/* 클릭/드래그 가능한 투명 range input */}
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={progress}
            onChange={onSeek}
            className="absolute opacity-0 cursor-pointer"
            style={{ inset: 0, width: "100%", height: "300%", top: "-150%", margin: 0, padding: 0 }}
          />
        </div>
      </div>

      {/* hover 시 시간 툴팁 */}
      {hovering && track && (
        <div
          className="fixed z-[60] flex items-center gap-1 pointer-events-none"
          style={{
            bottom: 72,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 10,
            color: "rgba(255,255,255,0.45)",
          }}
        >
          <span>{formatTime(progress)}</span>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>/</span>
          <span>{formatTime(duration)}</span>
        </div>
      )}
    </>
  );
}
