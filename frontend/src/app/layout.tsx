import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { PlayerSection } from "@/components/PlayerSection";
import { ContentArea } from "@/components/ContentArea";
import { AuthInit } from "@/components/AuthInit";
import { DMPanel } from "@/components/DMPanel";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "whatpl",
  description: "Your personal music streaming service",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${inter.variable} ${playfair.variable}`}>
      <body className="bg-bg-base text-white font-sans">
        <AuthInit />
        <div className="flex h-screen flex-col">
          <ContentArea>
            <div className="relative flex-shrink-0 hidden md:block" style={{ width: "var(--sidebar-width)" }}>
              <Sidebar />
            </div>
            <main className="flex-1 overflow-y-auto bg-bg-base h-full pb-24">
              {children}
            </main>
          </ContentArea>
          <PlayerSection />
          <DMPanel />
        </div>
      </body>
    </html>
  );
}
