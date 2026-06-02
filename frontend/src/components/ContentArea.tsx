"use client";
import { useAuthStore } from "@/store/authStore";

export function ContentArea({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  return (
    <div className="flex flex-1 overflow-hidden">
      {children}
    </div>
  );
}
