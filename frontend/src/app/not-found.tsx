import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-5 p-8 select-none">
      <p
        style={{
          fontSize: "96px",
          fontFamily: "var(--font-playfair, 'Playfair Display', Georgia, serif)",
          color: "rgba(255,255,255,0.06)",
          lineHeight: 1,
          letterSpacing: "-0.04em",
        }}
      >
        404
      </p>
      <p className="text-[15px]" style={{ color: "rgba(255,255,255,0.5)" }}>
        페이지를 찾을 수 없습니다.
      </p>
      <Link
        href="/"
        className="mt-2 px-5 py-2 rounded-full text-xs transition-colors"
        style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)" }}
      >
        홈으로
      </Link>
    </div>
  );
}
