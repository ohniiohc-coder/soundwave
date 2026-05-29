"use client";
import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/authStore";
import { Player } from "./Player";
import { QueuePanel } from "./QueuePanel";
import { usePlayerStore } from "@/store/playerStore";
import { api } from "@/lib/api";

export function PlayerSection() {
  const { user, initialized } = useAuthStore();

  const currentTrackId = usePlayerStore((s) => {
    if (s.contextType && s.contextTracks.length > 0) return s.contextTracks[s.contextIndex]?.id ?? null;
    return s.queue[s.currentIndex]?.id ?? null;
  });
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const reportedRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!user) return;
    const toReport = isPlaying ? currentTrackId : null;
    if (reportedRef.current === toReport) return;
    reportedRef.current = toReport;
    api.updateNowPlaying(toReport).catch(() => {});
  }, [isPlaying, currentTrackId, user]);

  useEffect(() => {
    if (!user && reportedRef.current !== null) {
      reportedRef.current = null;
    }
  }, [user]);

  if (!initialized || !user) return null;
  return (
    <>
      <QueuePanel />
      <Player />
    </>
  );
}
