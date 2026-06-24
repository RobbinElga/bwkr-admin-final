"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/Icon";

export function Modal({ open, onClose, title, children, maxWidth = "max-w-lg" }: {
    open: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    maxWidth?: string;
}) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, [open, onClose]);

    if (!open || typeof document === "undefined") return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* overlay polos (tanpa backdrop-blur — jauh lebih ringan) */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className={`relative w-full ${maxWidth} max-h-[90vh] overflow-y-auto bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant`}>
                <div className="sticky top-0 z-10 bg-surface-container-lowest border-b border-outline-variant px-5 py-4 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-on-surface">{title}</h3>
                    <button onClick={onClose} className="p-1.5 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors">
                        <Icon name="close" className="text-[20px]" />
                    </button>
                </div>
                <div className="p-5">{children}</div>
            </div>
        </div>,
        document.body
    );
}