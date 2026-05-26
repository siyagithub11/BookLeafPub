"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User } from "@/types";

interface AuthState {
  user: User | null;
  token: string | null; // only used for socket auth — JWT lives in httpOnly cookie
  isAuthenticated: boolean;
  isHydrated: boolean;

  setUser: (user: User, token?: string) => void;
  clearUser: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isHydrated: false,

      setUser: (user, token) =>
        set({ user, token: token ?? null, isAuthenticated: true }),

      clearUser: () =>
        set({ user: null, token: null, isAuthenticated: false }),

      setHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: "bookleaf-auth",
      // Only persist non-sensitive fields — actual auth is via httpOnly cookie
      partialize: (state) => ({
        user: state.user,
        token: state.token, // socket needs this
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);