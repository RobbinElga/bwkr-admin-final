// components/layout/Topbar.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/stores/auth";
import { Icon } from "@/components/ui/Icon";
import { useNotifications } from "@/components/notification/NotificationProvider";
import type { AppNotification } from "@/types";

function timeLabel(iso: string) {
    return new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function Topbar({ onMenu }: { onMenu: () => void }) {
    const { user } = useAdminAuth();
    const { items, unreadCount, markRead, markAllRead } = useNotifications();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        function onClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, []);

    function openItem(n: AppNotification) {
        if (!n.is_read) markRead(n.id);
        if (n.link) router.push(n.link);
        setOpen(false);
    }

    return (
        <header className="fixed top-0 right-0 w-full lg:w-[calc(100%-260px)] h-16 z-40 bg-surface-container-lowest border-b border-outline-variant flex items-center justify-between px-4 sm:px-6 shadow-sm">
            <div className="flex items-center gap-2">
                <button onClick={onMenu} className="lg:hidden -ml-2 p-2 rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors" aria-label="Buka menu">
                    <Icon name="menu" className="text-[24px]" />
                </button>
                <span className="font-semibold text-primary text-base">BWKR Platform</span>
            </div><div className="flex items-center gap-2">
                <button onClick={onMenu} className="lg:hidden -ml-2 p-2 rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors" aria-label="Buka menu">
                    <Icon name="menu" className="text-[24px]" />
                </button>
                <span className="font-semibold text-primary text-base">BWKR Platform</span>
            </div>

            <div className="flex items-center gap-3">
                {/* Lonceng notifikasi */}
                <div className="relative" ref={ref}>
                    <button
                        onClick={() => setOpen((v) => !v)}
                        className="relative p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-full transition-colors"
                        aria-label="Notifikasi"
                    >
                        <Icon name="notifications" className="text-[22px]" />
                        {unreadCount > 0 && (
                            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-on-error">
                                {unreadCount > 9 ? "9+" : unreadCount}
                            </span>
                        )}
                    </button>

                    {open && (
                        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-xl">
                            <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
                                <span className="text-sm font-semibold text-on-surface">Notifikasi</span>
                                {unreadCount > 0 && (
                                    <button onClick={() => markAllRead()} className="text-xs font-medium text-primary hover:underline">
                                        Tandai semua dibaca
                                    </button>
                                )}
                            </div>
                            <div className="max-h-96 overflow-y-auto">
                                {items.length === 0 ? (
                                    <div className="px-4 py-10 text-center text-sm text-on-surface-variant">Belum ada notifikasi.</div>
                                ) : (
                                    items.map((n) => (
                                        <button
                                            key={n.id}
                                            onClick={() => openItem(n)}
                                            className={`flex w-full gap-3 border-b border-outline-variant/50 px-4 py-3 text-left transition-colors hover:bg-surface-container-low ${n.is_read ? "" : "bg-primary/5"}`}
                                        >
                                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                <Icon name="notifications" className="text-[16px]" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className={`text-sm ${n.is_read ? "text-on-surface-variant" : "font-semibold text-on-surface"}`}>{n.title}</p>
                                                {n.body && <p className="line-clamp-2 text-xs text-on-surface-variant">{n.body}</p>}
                                                <p className="mt-0.5 text-[11px] text-outline">{timeLabel(n.created_at)}</p>
                                            </div>
                                            {!n.is_read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* User */}
                <div className="flex items-center gap-2.5 pl-3 border-l border-outline-variant">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-semibold text-primary leading-tight">{user?.name ?? "Admin"}</p>
                        <p className="text-xs text-on-surface-variant capitalize leading-tight">{user?.role?.replace("_", " ") ?? ""}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary text-sm font-bold">
                        {user?.name?.charAt(0).toUpperCase() ?? "A"}
                    </div>
                </div>
            </div>
        </header>
    );
}