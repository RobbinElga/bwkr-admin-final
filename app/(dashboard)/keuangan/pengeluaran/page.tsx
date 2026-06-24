"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Expense, ExpenseStatus } from "@/types";
import { getExpenses, approveExpense, rejectExpense, getExpenseFile } from "@/services/expense";
import { useAdminAuth } from "@/stores/auth";
import { friendlyError } from "@/lib/errors";
import { formatRupiah, formatDate } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ExpenseFormModal } from "@/components/expense/ExpenseFormModal";
import { ExportButton } from "@/components/ui/ExportButton";

type ViewState = "loading" | "ready" | "error";

const STATUS: Record<ExpenseStatus, { label: string; cls: string }> = {
    pending: { label: "Pending", cls: "bg-tertiary-container/10 text-tertiary-container" },
    approved: { label: "Disetujui", cls: "bg-primary/10 text-primary" },
    rejected: { label: "Ditolak", cls: "bg-error/10 text-error" },
};

export default function PengeluaranPage() {
    const router = useRouter();
    const logout = useAdminAuth((s) => s.logout);

    const [state, setState] = useState<ViewState>("loading");
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [errMsg, setErrMsg] = useState("");
    const [statusFilter, setStatusFilter] = useState<ExpenseStatus | "">("");
    const [formOpen, setFormOpen] = useState(false);
    const [confirm, setConfirm] = useState<{ expense: Expense; action: "approve" | "reject" } | null>(null);
    const [confirmLoading, setConfirmLoading] = useState(false);
    const user = useAdminAuth((s) => s.user);
    const canApprove = user?.role === "super_admin" || user?.role === "admin";

    async function load() {
        setState("loading");
        try {
            setExpenses(await getExpenses({}));
            setState("ready");
        } catch (err) {
            const code = err instanceof Error ? err.message : "SERVER";
            if (code === "UNAUTHORIZED") { await logout(); router.replace("/login"); return; }
            setErrMsg(friendlyError(code));
            setState("error");
        }
    }
    useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    async function openFile(id: number, type: "receipt" | "ttd" | "materai") {
        try {
            const url = await getExpenseFile(id, type);
            window.open(url, "_blank", "noopener,noreferrer");
        } catch {
            alert("Gagal memuat file.");
        }
    }

    async function runConfirm() {
        if (!confirm) return;
        setConfirmLoading(true);
        try {
            if (confirm.action === "approve") await approveExpense(confirm.expense.id);
            else await rejectExpense(confirm.expense.id);
            setConfirm(null);
            load();
        } catch (err) {
            const code = err instanceof Error ? err.message : "SERVER";
            if (code === "UNAUTHORIZED") { await logout(); router.replace("/login"); return; }
            alert(friendlyError(code));
        } finally {
            setConfirmLoading(false);
        }
    }

    const filtered = useMemo(
        () => expenses.filter((e) => !statusFilter || e.status === statusFilter),
        [expenses, statusFilter]
    );
    const pending = expenses.filter((e) => e.status === "pending");
    const pendingTotal = pending.reduce((s, e) => s + e.amount, 0);
    const approvedTotal = expenses.filter((e) => e.status === "approved").reduce((s, e) => s + e.amount, 0);

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-on-surface">Pengeluaran Keuangan</h2>
                    <p className="text-sm text-on-surface-variant mt-1">Catat & verifikasi penggunaan dana wakaf per project.</p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <ExportButton path="expenses/export" name="laporan-pengeluaran" params={{ status: statusFilter }} />
                    <button onClick={() => setFormOpen(true)}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container transition-colors">
                        <Icon name="add_circle" className="text-[18px]" /> Catat Pengeluaran Baru
                    </button>
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 max-w-2xl">
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
                    <div className="w-10 h-10 rounded-lg bg-tertiary-container/15 text-tertiary-container flex items-center justify-center mb-3">
                        <Icon name="pending_actions" className="text-[22px]" />
                    </div>
                    <p className="text-xs uppercase tracking-wide text-on-surface-variant">Menunggu Approval</p>
                    <p className="text-xl font-bold text-on-surface mt-0.5">{pending.length} <span className="text-sm font-normal text-on-surface-variant">transaksi</span></p>
                    <p className="text-xs text-on-surface-variant mt-1 font-mono">{formatRupiah(pendingTotal)}</p>
                </div>
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
                        <Icon name="check_circle" className="text-[22px]" />
                    </div>
                    <p className="text-xs uppercase tracking-wide text-on-surface-variant">Total Disetujui</p>
                    <p className="text-xl font-bold text-on-surface mt-0.5 font-mono">{formatRupiah(approvedTotal)}</p>
                </div>
            </div>

            {/* Filter */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-t-xl border-b-0 p-4 flex gap-3">
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ExpenseStatus | "")}
                    className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none">
                    <option value="">Semua Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Disetujui</option>
                    <option value="rejected">Ditolak</option>
                </select>
            </div>

            {state === "loading" ? (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-b-xl p-5 animate-pulse">
                    {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-surface-container rounded mb-2" />)}
                </div>
            ) : state === "error" ? (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-b-xl flex flex-col items-center justify-center text-center py-16">
                    <div className="w-14 h-14 rounded-full bg-error-container flex items-center justify-center text-on-error-container mb-4"><Icon name="cloud_off" className="text-[28px]" /></div>
                    <h3 className="text-lg font-semibold text-on-surface">Gagal Memuat Data</h3>
                    <p className="text-sm text-on-surface-variant mt-1">{errMsg}</p>
                    <button onClick={load} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container transition-colors"><Icon name="refresh" className="text-[18px]" /> Coba Lagi</button>
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-b-xl flex flex-col items-center justify-center text-center py-16">
                    <Icon name="receipt_long" className="text-[40px] text-outline-variant mb-3" />
                    <h3 className="text-base font-semibold text-on-surface">Belum Ada Pengeluaran</h3>
                    <p className="text-sm text-on-surface-variant mt-1">{statusFilter ? "Tidak ada yang cocok dengan filter." : "Catat pengeluaran pertama Anda."}</p>
                </div>
            ) : (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-b-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm min-w-[820px]">
                            <thead>
                                <tr className="bg-surface-container-low/50 border-b border-outline-variant text-xs uppercase tracking-wide text-on-surface-variant">
                                    <th className="px-5 py-3 font-semibold">Project</th>
                                    <th className="px-5 py-3 font-semibold text-right">Nominal</th>
                                    <th className="px-5 py-3 font-semibold">Bukti</th>
                                    <th className="px-5 py-3 font-semibold text-center">Status</th>
                                    <th className="px-5 py-3 font-semibold">Tanggal</th>
                                    <th className="px-5 py-3 font-semibold text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant/60">
                                {filtered.map((e) => {
                                    const st = STATUS[e.status] ?? STATUS.pending;
                                    return (
                                        <tr key={e.id} className="hover:bg-surface-container-low transition-colors">
                                            <td className="px-5 py-4 font-medium text-on-surface">{e.project?.name ?? `Project #${e.project_id}`}</td>
                                            <td className="px-5 py-4 text-right font-mono text-on-surface whitespace-nowrap">{formatRupiah(e.amount)}</td>
                                            <td className="px-5 py-4">
                                                <div className="flex gap-1">
                                                    {e.has_receipt && <FileBtn icon="receipt" title="Kuitansi" onClick={() => openFile(e.id, "receipt")} />}
                                                    {e.has_ttd && <FileBtn icon="draw" title="TTD" onClick={() => openFile(e.id, "ttd")} />}
                                                    {e.needs_materai && (
                                                        <FileBtn icon="verified" title="Materai" disabled={!e.has_materai}
                                                            className={e.has_materai ? "text-primary" : "text-error"} onClick={() => openFile(e.id, "materai")} />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>{st.label}</span>
                                            </td>
                                            <td className="px-5 py-4 text-on-surface-variant whitespace-nowrap">{formatDate(e.created_at)}</td>
                                            <td className="px-5 py-4">
                                                {e.status === "pending" ? (
                                                    canApprove ? (
                                                        <div className="flex justify-center gap-1">
                                                            <button onClick={() => setConfirm({ expense: e, action: "approve" })} title="Setujui"
                                                                className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors"><Icon name="check_circle" className="text-[18px]" /></button>
                                                            <button onClick={() => setConfirm({ expense: e, action: "reject" })} title="Tolak"
                                                                className="p-2 rounded-lg text-error hover:bg-error-container/30 transition-colors"><Icon name="cancel" className="text-[18px]" /></button>
                                                        </div>
                                                    ) : (
                                                        <p className="text-center text-xs text-tertiary-container">Menunggu super admin</p>
                                                    )
                                                ) : (
                                                    <p className="text-center text-xs text-on-surface-variant">—</p>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <ExpenseFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={() => { setFormOpen(false); load(); }} />

            <ConfirmDialog
                open={!!confirm}
                title={confirm?.action === "approve" ? "Setujui Pengeluaran" : "Tolak Pengeluaran"}
                message={
                    confirm?.action === "approve"
                        ? `Setujui pengeluaran ${formatRupiah(confirm?.expense.amount ?? 0)} untuk ${confirm?.expense.project?.name ?? "project ini"}?`
                        : `Tolak pengeluaran ${formatRupiah(confirm?.expense.amount ?? 0)} ini?`
                }
                confirmLabel={confirm?.action === "approve" ? "Setujui" : "Tolak"}
                danger={confirm?.action === "reject"}
                loading={confirmLoading}
                onConfirm={runConfirm}
                onClose={() => setConfirm(null)}
            />
        </div>
    );
}

function FileBtn({ icon, title, onClick, disabled, className = "" }: {
    icon: string; title: string; onClick: () => void; disabled?: boolean; className?: string;
}) {
    return (
        <button onClick={onClick} disabled={disabled} title={title}
            className={`p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container disabled:opacity-40 transition-colors ${className}`}>
            <Icon name={icon} className="text-[18px]" />
        </button>
    );
}