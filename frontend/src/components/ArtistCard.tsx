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
      className="group flex flex-col items-center gap-3 p-4 rounded-xl bg-bg-panel hover:bg-bg-elevated transition-colors cursor-pointer text-center"
    >
      <div className="relative w-24 h-24 rounded-full overflow-hidden bg-bg-elevated">
        {artist.image_url ? (
          <Image
            src={artist.image_url}
            alt={artist.name}
            fill
            className="object-cover"
            sizes="96px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Mic2 size={32} className="text-muted" />
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-medium line-clamp-1">{artist.name}</p>
        <p className="text-xs text-muted">아티스트</p>
      </div>
    </Link>
  );
}
