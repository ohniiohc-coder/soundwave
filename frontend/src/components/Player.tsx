"use client";
import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { usePlayerStore, PlayerTrack } from "@/store/playerStore";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Music2, ListMusic } from "lucide-react";
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
  const skipSave = useRef(true); // 초기 로드 중엔 저장 건너뜀

  const router = useRouter();
  const { user, initialized } = useAuthStore();

  const {
    currentTrack, isPlaying, volume, progress, duration, isQueueOpen,
    toggle, next, prev, setQueue, pause: pauseStore,
    setVolume, setProgress, setDuration, toggleQueue,
    queue, contextType, activeContextId, contextTracks, contextPlayKey,
  } = usePlayerStore();

  // ── 앱 시작 시 DB에서 대기열 복원 ──────────────────────────────────────
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

  // ── 로그인 상태 확인 — 미로그인 시 재생 차단 ──────────────────────────
  useEffect(() => {
    if (!initialized) return;
    if (isPlaying && !user) {
      pauseStore();
      router.push("/login");
    }
  }, [isPlaying, user, initialized]);

  // ── 컨텍스트(앨범/플레이리스트) 변경 시 DB에 최근 재생 저장 ────────────
  useEffect(() => {
    if (!activeContextId || !contextType) return;
    const name = contextType === "album"
      ? (contextTracks[0]?.albumTitle ?? "")
      : activeContextId; // 플레이리스트 이름은 QueuePanel에서 덮어씀
    if (!name) return;
    api.upsertRecentContext(contextType, activeContextId, name).catch(() => {});
  }, [activeContextId, contextType]);

  // ── 대기열 변경 시 1초 디바운스로 DB 저장 ─────────────────────────────
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
    if (audio.src !== src) {
      audio.src = src;
      audio.load();
    }
    if (isPlaying) audio.play().catch(() => {});
  }, [track?.id]);

  // 같은 앨범/플레이리스트를 다시 재생하면 처음부터 재시작
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
      <audio
        ref={audioRef}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={next}
      />
      <div
        className="fixed bottom-0 left-0 right-0 bg-bg-panel border-t border-border flex items-center px-4 gap-4 z-50"
        style={{ height: "var(--player-height)" }}
      >
        {/* 트랙 정보 */}
        <div className="flex items-center gap-3 w-64 min-w-0">
          <div className="w-12 h-12 rounded bg-bg-elevated flex-shrink-0 overflow-hidden">
            {track?.coverUrl ? (
              <Image src={track.coverUrl} alt={track.albumTitle || ""} width={48} height={48} className="object-cover w-full h-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music2 size={18} className="text-muted" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{track?.title ?? "재생 중 없음"}</p>
            <p className="text-xs text-muted truncate">{track?.artistName ?? ""}</p>
          </div>
        </div>

        {/* 컨트롤 + 진행 바 */}
        <div className="flex-1 flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-5">
            <button onClick={prev} className="text-muted hover:text-white transition-colors">
              <SkipBack size={20} />
            </button>
            <button
              onClick={toggle}
              className="w-9 h-9 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform text-black"
            >
              {isPlaying ? <Pause size={18} fill="black" /> : <Play size={18} fill="black" />}
            </button>
            <button onClick={next} className="text-muted hover:text-white transition-colors">
              <SkipForward size={20} />
            </button>
          </div>
          <div className="flex items-center gap-2 w-full max-w-lg">
            <span className="text-xs text-muted w-10 text-right">{formatTime(progress)}</span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={progress}
              onChange={onSeek}
              className="flex-1"
              style={{
                background: `linear-gradient(to right, #c9a96e ${progressPct}%, #2a2a2a ${progressPct}%)`,
              }}
            />
            <span className="text-xs text-muted w-10">{formatTime(duration)}</span>
          </div>
        </div>

        {/* 큐 버튼 + 볼륨 */}
        <div className="flex items-center gap-2 w-40 justify-end">
          <button
            onClick={toggleQueue}
            className={`transition-colors ${isQueueOpen ? "text-accent" : "text-muted hover:text-white"}`}
            title="재생 대기열"
          >
            <ListMusic size={18} />
          </button>
          <button
            onClick={() => setVolume(volume > 0 ? 0 : 0.8)}
            className="text-muted hover:text-white transition-colors"
          >
            {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-24"
            style={{
              background: `linear-gradient(to right, #c9a96e ${volume * 100}%, #2a2a2a ${volume * 100}%)`,
            }}
          />
        </div>
      </div>
    </>
  );
}
