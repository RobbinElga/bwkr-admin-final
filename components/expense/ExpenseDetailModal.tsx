"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { formatRupiah, formatDate } from "@/lib/format";
import { getExpenseFileUrl } from "@/services/expense";
import type { Expense } from "@/types";

const STATUS: Record<string, string> = { pending: "Pending", approved: "Disetujui", rejected: "Ditolak" };
const FILES = [
    { key: "receipt", flag: "has_receipt", label: "Kuitansi" },
    { key: "ttd", flag: "has_ttd", label: "Tanda Tangan" },
    { key: "materai", flag: "has_materai", label: "Materai" },
] as const;

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between gap-4 border-b border-outline-variant/50 pb-2">
            <span className="text-sm text-on-surface-variant">{label}</span>
            <span className="text-sm font-medium text-on-surface text-right">{value}</span>
        </div>
    );
}

export function ExpenseDetailModal({ open, expense, onClose }: {
    open: boolean; expense: Expense | null; onClose: () => void;
}) {
    const [urls, setUrls] = useState<Record<string, string>>({});

    useEffect(() => {
        setUrls({});
        if (!open || !expense) return;
        FILES.forEach((f) => {
            if ((expense as unknown as Record<string, boolean>)[f.flag]) {
                getExpenseFileUrl(expense.id, f.key).then((u) => setUrls((p) => ({ ...p, [f.key]: u }))).catch(() => { });
            }
        });
    }, [open, expense]);

    if (!expense) return null;
    const anyFile = FILES.some((f) => (expense as unknown as Record<string, boolean>)[f.flag]);

    return (
        <Modal open={open} onClose={onClose} title="Detail Pengeluaran" maxWidth="max-w-2xl">
            <div className="flex flex-col gap-4">
                <Row label="Project" value={expense.project?.name ?? `Project #${expense.project_id}`} />
                <Row label="Nominal" value={formatRupiah(expense.amount)} />
                <Row label="Status" value={STATUS[expense.status] ?? expense.status} />
                <Row label="Perlu Materai" value={expense.needs_materai ? "Ya" : "Tidak"} />
                {expense.notes && <Row label="Catatan" value={expense.notes} />}
                <Row label="Tanggal" value={formatDate(expense.created_at)} />

                <div>
                    <p className="text-sm font-medium text-on-surface mb-2">Bukti</p>
                    {!anyFile ? (
                        <p className="text-sm text-on-surface-variant">Tidak ada bukti terlampir.</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {FILES.filter((f) => (expense as unknown as Record<string, boolean>)[f.flag]).map((f) => (
                                <div key={f.key} className="rounded-lg border border-outline-variant overflow-hidden">
                                    <div className="px-3 py-2 text-xs font-medium text-on-surface-variant bg-surface-container-low">{f.label}</div>
                                    {urls[f.key] ? (
                                        <a href={urls[f.key]} target="_blank" rel="noopener noreferrer">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={urls[f.key]} alt={f.label} className="w-full h-40 object-contain bg-white" />
                                        </a>
                                    ) : (
                                        <div className="h-40 flex items-center justify-center bg-surface-container animate-pulse text-on-surface-variant">
                                            <Icon name="hourglass_empty" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}