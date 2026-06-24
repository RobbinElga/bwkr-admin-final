"use client";

import {
    createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { getNotifications, markRead as apiMarkRead, markAllRead as apiMarkAllRead } from "@/services/notification";
import { useAdminAuth } from "@/stores/auth";
import { Icon } from "@/components/ui/Icon";
import type { AppNotification } from "@/types";

type Ctx = {
    items: AppNotification[];
    unreadCount: number;
    refresh: () => Promise<void>;
    markRead: (id: number) => Promise<void>;
    markAllRead: () => Promise<void>;
};

const NotificationContext = createContext<Ctx | null>(null);
const POLL_MS = 20000;

function timeLabel(iso: string) {
    return new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function NotificationProvider({ children }: { children: ReactNode }) {
    const status = useAdminAuth((s) => s.status);
    const [items, setItems] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [toasts, setToasts] = useState<AppNotification[]>([]);
    const lastMaxId = useRef(0);
    const initialized = useRef(false);

    const refresh = useCallback(async () => {
        try {
            const res = await getNotifications();
            setItems(res.data);
            setUnreadCount(res.unread_count);

            const maxId = res.data.reduce((m, n) => Math.max(m, n.id), 0);
            if (initialized.current) {
                const fresh = res.data.filter((n) => n.id > lastMaxId.current && !n.is_read);
                if (fresh.length) setToasts((t) => [...fresh, ...t].slice(0, 4));
            }
            lastMaxId.current = Math.max(lastMaxId.current, maxId);
            initialized.current = true;
        } catch {
            /* best-effort, diamkan */
        }
    }, []);

    useEffect(() => {
        if (status !== "authenticated") return;
        refresh();
        const id = setInterval(refresh, POLL_MS);
        const onFocus = () => refresh();
        window.addEventListener("focus", onFocus);
        return () => { clearInterval(id); window.removeEventListener("focus", onFocus); };
    }, [status, refresh]);

    const markRead = useCallback(async (id: number) => {
        setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
        setUnreadCount((c) => Math.max(0, c - 1));
        try { await apiMarkRead(id); } catch { /* ignore */ }
    }, []);

    const markAllRead = useCallback(async () => {
        setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
        try { await apiMarkAllRead(); } catch { /* ignore */ }
    }, []);

    const dismissToast = useCallback((id: number) => {
        setToasts((t) => t.filter((x) => x.id !== id));
    }, []);

    return (
        <NotificationContext.Provider value={{ items, unreadCount, refresh, markRead, markAllRead }}>
            {children}

            {/* Toast pojok kanan bawah */}
            <div className="fixed bottom-5 right-5 z-[200] flex w-80 max-w-[calc(100vw-2.5rem)] flex-col gap-2">
                {toasts.map((t) => (
                    <ToastCard key={t.id} toast={t} label={timeLabel(t.created_at)} onDismiss={dismissToast} />
                ))}
            </div>
        </NotificationContext.Provider>
    );
}

function ToastCard({ toast, label, onDismiss }: { toast: AppNotification; label: string; onDismiss: (id: number) => void }) {
    const router = useRouter();
    useEffect(() => {
        const id = setTimeout(() => onDismiss(toast.id), 6000);
        return () => clearTimeout(id);
    }, [toast.id, onDismiss]);

    return (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-xl" style={{ animation: "bwkr-toast-in 0.3s ease-out" }}>
            <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon name="notifications" className="text-[18px]" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-on-surface">{toast.title}</p>
                    {toast.body && <p className="mt-0.5 line-clamp-2 text-xs text-on-surface-variant">{toast.body}</p>}
                    <p className="mt-0.5 text-[11px] text-outline">{label}</p>
                    {toast.link && (
                        <button
                            onClick={() => { router.push(toast.link!); onDismiss(toast.id); }}
                            className="mt-1.5 text-xs font-semibold text-primary hover:underline"
                        >
                            Lihat
                        </button>
                    )}
                </div>
                <button onClick={() => onDismiss(toast.id)} className="text-on-surface-variant hover:text-on-surface">
                    <Icon name="close" className="text-[18px]" />
                </button>
            </div>
        </div>
    );
}

export function useNotifications() {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error("useNotifications harus dipakai di dalam NotificationProvider");
    return ctx;
}