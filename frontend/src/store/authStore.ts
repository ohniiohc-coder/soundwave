"use client";
import { create } from "zustand";

export type AuthUser = {
  id: string;
  display_name: string;
  username: string;
  role: string;
  created_at: string;
};

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  initialized: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  logout: () => void;
  setInitialized: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  initialized: false,

  setAuth: (user, token) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_token", token);
    }
    set({ user, token });
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
    }
    set({ user: null, token: null });
  },

  setInitialized: () => set({ initialized: true }),
}));
