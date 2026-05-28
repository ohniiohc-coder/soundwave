"use client";
import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";

export function AuthInit() {
  const { setAuth, logout, setInitialized } = useAuthStore();

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) { setInitialized(); return; }
    api.getMe()
      .then((user) => { setAuth(user, token); setInitialized(); })
      .catch(() => { logout(); setInitialized(); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
