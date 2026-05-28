import { ReactNode } from "react";

export default function Template({ children }: { children: ReactNode }) {
  return (
    <div style={{ animation: "fadeUp 0.28s ease", willChange: "opacity, transform" }}>
      {children}
    </div>
  );
}
