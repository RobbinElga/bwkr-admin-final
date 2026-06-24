"use client";

import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";

export function ConfirmDialog({
    open, title, message, confirmLabel = "Hapus", danger = true, loading = false, onConfirm, onClose,
}: {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    danger?: boolean;
    loading?: boolean;
    onConfirm: () => void;
    onClose: () => void;
}) {
    return (
        <Modal open={open} onClose={loading ? () => { } : onClose} title={title} maxWidth="max-w-md">
            <p className="text-sm text-on-surface-variant leading-relaxed">{message}</p>
            <div className="flex justify-end gap-3 mt-6">
                <button
                    onClick={onClose}
                    disabled={loading}
                    className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container disabled:opacity-50 transition-colors"
                >
                    Batal
                </button>
                <button
                    onClick={onConfirm}
                    disabled={loading}
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${danger ? "bg-error hover:bg-error/90" : "bg-primary hover:bg-primary-container"
                        }`}
                >
                    {loading && <Icon name="progress_activity" className="text-[18px] animate-spin" />}
                    {loading ? "Memproses..." : confirmLabel}
                </button>
            </div>
        </Modal>
    );
}