import { create } from "zustand";
import type { StaffUser } from "@/types";
import { getMe, getToken, clearToken, logoutStaff } from "@/services/auth";

type AuthState = {
    user: StaffUser | null;
    status: "loading" | "authenticated" | "guest";
    setUser: (u: StaffUser, token: string) => void;
    hydrate: () => Promise<void>;
    logout: () => Promise<void>;
};

export const useAdminAuth = create<AuthState>((set) => ({
    user: null,
    status: "loading",

    setUser: (user) => set({ user, status: "authenticated" }),

    hydrate: async () => {
        if (!getToken()) { set({ user: null, status: "guest" }); return; }
        try {
            set({ user: await getMe(), status: "authenticated" });
        } catch {
            clearToken();
            set({ user: null, status: "guest" });
        }
    },

    logout: async () => {
        try { await logoutStaff(); } catch { /* abaikan */ }
        clearToken();
        set({ user: null, status: "guest" });
    },
}));