"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { DonationInput, DonationStatus, DonationSource } from "@/types";
import { useAdminAuth } from "@/stores/auth";
import { friendlyError } from "@/lib/errors";
import { formatRupiah, formatDate } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { DonationInputFormModal } from "@/components/donation/DonationInputFormModal";
import { ExportButton } from "@/components/ui/ExportButton";
import { getDonationInputs, deleteDonation } from "@/services/donation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type ViewState = "loading" | "ready" | "error";

const STATUS: Record<DonationStatus, { label: string; cls: string }> = {
    pending: { label: "Pending", cls: "bg-tertiary-container/10 text-tertiary-container" },
    claimed: { label: "Diklaim", cls: "bg-primary/10 text-primary" },
    rejected: { label: "Ditolak", cls: "bg-error/10 text-error" },
};
const SOURCE: Record<DonationSource, string> = { online: "Online", manual: "Manual", gateway: "Gateway" };

export default function InputDonasiPage() {
    const router = useRouter();
    const logout = useAdminAuth((s) => s.logout);
    const isSuper = useAdminAuth((s) => s.user?.role) === "super_admin";
    const [deleting, setDeleting] = useState<DonationInput | null>(null);
    const [delLoading, setDelLoading] = useState(false);

    const [state, setState] = useState<ViewState>("loading");
    const [rows, setRows] = useState<DonationInput[]>([]);
    const [meta, setMeta] = useState<{ current_page: number; last_page: number } | null>(null);
    const [errMsg, setErrMsg] = useState("");

    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<DonationStatus | "">("");
    const [source, setSource] = useState<DonationSource | "">("");
    const [page, setPage] = useState(1);
    const [formOpen, setFormOpen] = useState(false);

    async function load() {
        setState("loading");
        try {
            const res = await getDonationInputs({ search, status, source, page });
            setRows(res.data);
            setMeta({ current_page: res.meta.current_page, last_page: res.meta.last_page });
            setState("ready");
        } catch (err) {
            const code = err instanceof Error ? err.message : "SERVER";
            if (code === "UNAUTHORIZED") { await logout(); router.replace("/login"); return; }
            setErrMsg(friendlyError(code));
            setState("error");
        }
    }

    async function confirmDelete() {
        if (!deleting) return;
        setDelLoading(true);
        try {
            await deleteDonation(deleting.id);
            setDeleting(null);
            load();
        } catch (err) {
            const code = err instanceof Error ? err.message : "SERVER";
            if (code === "UNAUTHORIZED") { await logout(); router.replace("/login"); return; }
            alert(friendlyError(code));
        } finally { setDelLoading(false); }
    }

    useEffect(() => { load(); }, [page, status, source]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        const t = setTimeout(() => { setPage(1); load(); }, 400);
        return () => clearTimeout(t);
    }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-on-surface">Input Donasi</h2>
                    <p className="text-sm text-on-surface-variant mt-1">Catat dana masuk hasil rekonsiliasi rekening.</p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <ExportButton path="donations-input/export" name="laporan-donasi" params={{ status, source, search }} />
                    <button
                        onClick={() => setFormOpen(true)}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container transition-colors whitespace-nowrap"
                    >
                        <Icon name="add" className="text-[18px]" /> Tambah Input Donasi
                    </button>
                </div>
            </div>

            {/* Filter */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 mb-6 flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="relative w-full sm:max-w-xs">
                    <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]" />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama wakif..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                </div>
                <select value={status} onChange={(e) => { setStatus(e.target.value as DonationStatus | ""); setPage(1); }}
                    className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none">
                    <option value="">Semua Status</option>
                    <option value="pending">Pending</option>
                    <option value="claimed">Diklaim</option>
                    <option value="rejected">Ditolak</option>
                </select>
                <select value={source} onChange={(e) => { setSource(e.target.value as DonationSource | ""); setPage(1); }}
                    className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none">
                    <option value="">Semua Sumber</option>
                    <option value="online">Online</option>
                    <option value="manual">Manual</option>
                    <option value="gateway">Gateway</option>
                </select>
            </div>

            {/* Konten */}
            {state === "loading" ? (
                <TableSkeleton />
            ) : state === "error" ? (
                <ErrorBox msg={errMsg} onRetry={load} />
            ) : rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-20 border border-dashed border-outline-variant rounded-xl">
                    <Icon name="inbox" className="text-[40px] text-outline-variant mb-3" />
                    <h3 className="text-base font-semibold text-on-surface">Belum Ada Data</h3>
                    <p className="text-sm text-on-surface-variant mt-1">
                        {search || status || source ? "Tidak ada data yang cocok dengan filter." : "Belum ada donasi tercatat."}
                    </p>
                </div>
            ) : (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.04)] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-outline-variant bg-surface-container-low/50 text-xs uppercase tracking-wide text-on-surface-variant">
                                    <th className="px-5 py-3 font-semibold">Ref</th>
                                    <th className="px-5 py-3 font-semibold">Wakif</th>
                                    <th className="px-5 py-3 font-semibold text-right">Nominal</th>
                                    <th className="px-5 py-3 font-semibold">Rekening</th>
                                    <th className="px-5 py-3 font-semibold text-center">Sumber</th>
                                    <th className="px-5 py-3 font-semibold text-center">Status</th>
                                    <th className="px-5 py-3 font-semibold text-right">Tanggal</th>
                                    <th className="px-5 py-3 font-semibold text-center">Bukti</th>
                                    {isSuper && <th className="px-5 py-3 font-semibold text-center">Aksi</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant/60">
                                {rows.map((d) => {
                                    const st = STATUS[d.status] ?? STATUS.pending;
                                    return (
                                        <tr key={d.id} className="hover:bg-surface-container-low transition-colors">
                                            <td className="px-5 py-3 font-mono text-primary whitespace-nowrap">{d.ref_no}</td>
                                            <td className="px-5 py-3 font-medium text-on-surface">{d.donor_name}</td>
                                            <td className="px-5 py-3 text-right font-mono text-on-surface whitespace-nowrap">{formatRupiah(d.amount)}</td>
                                            <td className="px-5 py-3 text-on-surface-variant">{d.bank_account?.bank_name ?? "—"}</td>
                                            <td className="px-5 py-3 text-center text-on-surface-variant">{SOURCE[d.source]}</td>
                                            <td className="px-5 py-3 text-center">
                                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>{st.label}</span>
                                            </td>
                                            <td className="px-5 py-3 text-right text-on-surface-variant whitespace-nowrap">{formatDate(d.created_at)}</td>
                                            <td className="px-5 py-3 text-center">
                                                {d.has_proof ? (
                                                    <Icon name="description" className="text-[20px] text-primary" />
                                                ) : (
                                                    <Icon name="remove" className="text-[18px] text-outline-variant" />
                                                )}
                                            </td>
                                            {isSuper && (
                                                <td className="px-5 py-3 text-center">
                                                    <button onClick={() => setDeleting(d)} title="Hapus"
                                                        className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors">
                                                        <Icon name="delete" className="text-[18px]" />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {meta && meta.last_page > 1 && (
                        <div className="flex items-center justify-center gap-3 py-4 border-t border-outline-variant">
                            <button disabled={meta.current_page <= 1} onClick={() => setPage((p) => p - 1)}
                                className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-3 py-1.5 text-sm text-on-surface hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                <Icon name="chevron_left" className="text-[18px]" /> Sebelumnya
                            </button>
                            <span className="text-sm text-on-surface-variant">Hal {meta.current_page} / {meta.last_page}</span>
                            <button disabled={meta.current_page >= meta.last_page} onClick={() => setPage((p) => p + 1)}
                                className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-3 py-1.5 text-sm text-on-surface hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                Berikutnya <Icon name="chevron_right" className="text-[18px]" />
                            </button>
                        </div>
                    )}
                </div>
            )}
            <DonationInputFormModal
                open={formOpen}
                onClose={() => setFormOpen(false)}
                onSaved={() => { setFormOpen(false); setPage(1); load(); }}
            />

            <ConfirmDialog
                open={!!deleting}
                title="Hapus Donasi"
                message={`Hapus donasi "${deleting?.donor_name}" (${deleting?.ref_no})? Data diarsipkan dan bisa dipulihkan superadmin dari halaman Sampah.`}
                confirmLabel="Hapus"
                danger
                loading={delLoading}
                onConfirm={confirmDelete}
                onClose={() => setDeleting(null)}
            />
        </div>
    );
}

function TableSkeleton() {
    return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 animate-pulse">
            <div className="h-8 bg-surface-container rounded mb-3" />
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 bg-surface-container rounded mb-2" />
            ))}
        </div>
    );
}

function ErrorBox({ msg, onRetry }: { msg: string; onRetry: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center text-center py-20">
            <div className="w-14 h-14 rounded-full bg-error-container flex items-center justify-center text-on-error-container mb-4">
                <Icon name="cloud_off" className="text-[28px]" />
            </div>
            <h3 className="text-lg font-semibold text-on-surface">Gagal Memuat Data</h3>
            <p className="text-sm text-on-surface-variant mt-1 max-w-sm">{msg}</p>
            <button onClick={onRetry} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container transition-colors">
                <Icon name="refresh" className="text-[18px]" /> Coba Lagi
            </button>
        </div>
    );
}