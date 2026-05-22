"use client";
import { create } from "zustand";
import { Track } from "@/lib/api";

export type PlayerTrack = Track & {
  albumTitle?: string;
  artistName?: string;
  coverUrl?: string;
};

export type ContextType = "playlist" | "album" | null;

type PlayerState = {
  // ── 노래 탭 큐 ──────────────────────────────────────────────────────────
  queue: PlayerTrack[];
  currentIndex: number;

  // ── 컨텍스트 (앨범 or 플레이리스트, 노래 탭 큐와 독립) ─────────────────
  contextTracks: PlayerTrack[];
  contextIndex: number;
  contextType: ContextType;
  activeContextId: string | null;

  // ── 공통 ────────────────────────────────────────────────────────────────
  isPlaying: boolean;
  volume: number;
  progress: number;
  duration: number;
  isQueueOpen: boolean;

  // ── 액션 ────────────────────────────────────────────────────────────────
  setQueue: (tracks: PlayerTrack[], startIndex?: number) => void;
  addToQueue: (tracks: PlayerTrack[], startIndex?: number) => void;

  /** 앨범/플레이리스트 컨텍스트 재생 — 노래 탭 큐를 건드리지 않음 */
  playContext: (type: "playlist" | "album", id: string, tracks: PlayerTrack[], startIndex?: number) => void;
  jumpToInContext: (index: number) => void;

  play: (track?: PlayerTrack) => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;

  setVolume: (v: number) => void;
  setProgress: (p: number) => void;
  setDuration: (d: number) => void;
  toggleQueue: () => void;

  reorderContext: (from: number, to: number) => void;
  removeFromContext: (index: number) => void;
  /** 큐 내 점프 — 큐 모드로 전환 */
  jumpTo: (index: number) => void;
  reorderQueue: (from: number, to: number) => void;
  removeFromQueue: (index: number) => void;

  currentTrack: () => PlayerTrack | null;
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue: [],
  currentIndex: 0,
  contextTracks: [],
  contextIndex: 0,
  contextType: null,
  activeContextId: null,
  isPlaying: false,
  volume: 0.8,
  progress: 0,
  duration: 0,
  isQueueOpen: false,

  // 현재 트랙: 컨텍스트 우선
  currentTrack: () => {
    const { contextType, contextTracks, contextIndex, queue, currentIndex } = get();
    if (contextType && contextTracks.length > 0) return contextTracks[contextIndex] ?? null;
    return queue[currentIndex] ?? null;
  },

  // ── 노래 탭 큐 ───────────────────────────────────────────────────────────
  setQueue: (tracks, startIndex = 0) => {
    set({ queue: tracks, currentIndex: startIndex, isPlaying: true, progress: 0 });
  },

  addToQueue: (tracks, startIndex = 0) => {
    const { queue } = get();
    const insertAt = queue.length;
    set({
      queue: [...queue, ...tracks],
      currentIndex: insertAt + startIndex,
      isPlaying: true,
      progress: 0,
      contextType: null,
      activeContextId: null,
    });
  },

  // ── 컨텍스트 재생 (앨범/플레이리스트) ───────────────────────────────────
  playContext: (type, id, tracks, startIndex = 0) => {
    const update: Partial<PlayerState> = {
      contextTracks: tracks,
      contextIndex: startIndex,
      contextType: type,
      activeContextId: id,
      isPlaying: true,
      progress: 0,
    };
    set(update);
  },

  jumpToInContext: (index) => {
    set({ contextIndex: index, isPlaying: true, progress: 0 });
  },


  removeFromContext: (index) => {
    const { contextTracks, contextIndex } = get();
    const next = contextTracks.filter((_, i) => i !== index);
    let newIndex = contextIndex;
    if (index < contextIndex) newIndex = contextIndex - 1;
    else if (index === contextIndex) {
      newIndex = Math.min(contextIndex, next.length - 1);
      if (!next.length) return set({ contextTracks: [], contextIndex: 0, isPlaying: false, progress: 0 });
    }
    set({ contextTracks: next, contextIndex: newIndex });
  },

  reorderContext: (from, to) => {
    const { contextTracks, contextIndex } = get();
    if (from === to) return;
    const next = [...contextTracks];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    let newIndex = contextIndex;
    if (contextIndex === from) newIndex = to;
    else if (from < contextIndex && to >= contextIndex) newIndex = contextIndex - 1;
    else if (from > contextIndex && to <= contextIndex) newIndex = contextIndex + 1;
    set({ contextTracks: next, contextIndex: newIndex });
  },

  // ── 큐 점프 → 큐 모드 전환 ───────────────────────────────────────────────
  jumpTo: (index) => {
    set({ currentIndex: index, isPlaying: true, progress: 0, contextType: null, activeContextId: null });
  },

  play: (track) => {
    if (track) {
      const { contextType, contextTracks, queue } = get();
      if (contextType) {
        const ci = contextTracks.findIndex((t) => t.id === track.id);
        if (ci >= 0) { set({ contextIndex: ci, isPlaying: true }); return; }
      }
      const qi = queue.findIndex((t) => t.id === track.id);
      if (qi >= 0) {
        set({ currentIndex: qi, isPlaying: true, contextType: null, activeContextId: null });
      } else {
        set({ queue: [track, ...queue], currentIndex: 0, isPlaying: true, contextType: null, activeContextId: null });
      }
    } else {
      set({ isPlaying: true });
    }
  },

  pause: () => set({ isPlaying: false }),
  toggle: () => set((s) => ({ isPlaying: !s.isPlaying })),

  next: () => {
    const { contextType, contextTracks, contextIndex, queue, currentIndex } = get();
    if (contextType && contextTracks.length > 0) {
      set({ contextIndex: (contextIndex + 1) % contextTracks.length, isPlaying: true, progress: 0 });
    } else {
      if (!queue.length) return;
      set({ currentIndex: (currentIndex + 1) % queue.length, isPlaying: true, progress: 0 });
    }
  },

  prev: () => {
    const { contextType, contextTracks, contextIndex, queue, currentIndex, progress } = get();
    if (progress > 3) { set({ progress: 0 }); return; }
    if (contextType && contextTracks.length > 0) {
      set({ contextIndex: (contextIndex - 1 + contextTracks.length) % contextTracks.length, isPlaying: true, progress: 0 });
    } else {
      if (!queue.length) return;
      set({ currentIndex: (currentIndex - 1 + queue.length) % queue.length, isPlaying: true, progress: 0 });
    }
  },

  setVolume: (v) => set({ volume: v }),
  setProgress: (p) => set({ progress: p }),
  setDuration: (d) => set({ duration: d }),
  toggleQueue: () => set((s) => ({ isQueueOpen: !s.isQueueOpen })),

  removeFromQueue: (index) => {
    const { queue, currentIndex } = get();
    const next = queue.filter((_, i) => i !== index);
    let newIndex = currentIndex;
    if (index < currentIndex) newIndex = currentIndex - 1;
    else if (index === currentIndex) {
      newIndex = Math.min(currentIndex, next.length - 1);
      if (!next.length) return set({ queue: [], currentIndex: 0, isPlaying: false, progress: 0 });
    }
    set({ queue: next, currentIndex: newIndex });
  },

  reorderQueue: (from, to) => {
    const { queue, currentIndex } = get();
    if (from === to) return;
    const next = [...queue];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    let newIndex = currentIndex;
    if (currentIndex === from) newIndex = to;
    else if (from < currentIndex && to >= currentIndex) newIndex = currentIndex - 1;
    else if (from > currentIndex && to <= currentIndex) newIndex = currentIndex + 1;
    set({ queue: next, currentIndex: newIndex });
  },
}));
