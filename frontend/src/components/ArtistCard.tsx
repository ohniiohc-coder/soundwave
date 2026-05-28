"use client";
import Link from "next/link";
import Image from "next/image";
import { Mic2 } from "lucide-react";
import { Artist } from "@/lib/api";

type Props = { artist: Artist };

export function ArtistCard({ artist }: Props) {
  return (
    <Link
      href={`/artist/${artist.id}`}
      className="group flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer"
    >
      <div className="relative w-[42px] h-[42px] rounded-full overflow-hidden bg-bg-elevated border border-border flex-shrink-0">
        {artist.image_url ? (
          <Image
            src={artist.image_url}
            alt={artist.name}
            fill
            className="object-cover"
            sizes="42px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Mic2 size={18} style={{ color: "rgba(255,255,255,0.2)" }} />
          </div>
        )}
      </div>
      <span className="text-sm truncate" style={{ color: "rgba(255,255,255,0.75)" }}>{artist.name}</span>
    </Link>
  );
}
