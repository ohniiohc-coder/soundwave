"use client";
import { useAuthStore } from "@/store/authStore";
import { Player } from "./Player";
import { QueuePanel } from "./QueuePanel";

export function PlayerSection() {
  const { user, initialized } = useAuthStore();
  if (!initialized || !user) return null;
  return (
    <>
      <QueuePanel />
      <Player />
    </>
  );
}
