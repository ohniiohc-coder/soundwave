import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Player } from "@/components/Player";
import { QueuePanel } from "@/components/QueuePanel";

export const metadata: Metadata = {
  title: "Soundwave",
  description: "Your personal music streaming service",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-bg-base text-white">
        <div className="flex h-screen flex-col">
          {/* 메인 영역: 사이드바 + 콘텐츠 */}
          <div
            className="flex flex-1 overflow-hidden"
            style={{ paddingBottom: "var(--player-height)" }}
          >
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-bg-base">
              {children}
            </main>
          </div>

          {/* 재생 대기열 패널 */}
          <QueuePanel />
          {/* 하단 플레이어 - 고정 */}
          <Player />
        </div>
      </body>
    </html>
  );
}
