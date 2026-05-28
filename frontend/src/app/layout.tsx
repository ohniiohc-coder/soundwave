import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { PlayerSection } from "@/components/PlayerSection";
import { ContentArea } from "@/components/ContentArea";
import { AuthInit } from "@/components/AuthInit";
import { TopBar } from "@/components/TopBar";

export const metadata: Metadata = {
  title: "Soundwave",
  description: "Your personal music streaming service",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-bg-base text-white">
        <AuthInit />
        <div className="flex h-screen flex-col">
          {/* 상단 바 - 전체 너비 */}
          <TopBar />
          {/* 메인 영역: 사이드바 + 콘텐츠 (로그인 시 하단 패딩 자동 적용) */}
          <ContentArea>
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-bg-base">
              {children}
            </main>
          </ContentArea>

          {/* 하단 플레이어 + 재생 대기열 — 로그인 시에만 표시 */}
          <PlayerSection />
        </div>
      </body>
    </html>
  );
}
