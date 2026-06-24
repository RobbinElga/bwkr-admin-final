"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { BankAccount } from "@/types";
import { getAdminBankAccounts, deleteBankAccount, saveBankAccount } from "@/services/bank";
import { useAdminAuth } from "@/stores/auth";
import { friendlyError } from "@/lib/errors";
import { Icon } from "@/components/ui/Icon";
import { BankAccountFormModal } from "@/components/bank/BankAccountFormModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatRupiah } from "@/lib/format";

type ViewState = "loading" | "ready" | "error";

export default function RekeningPage() {
    const router = useRouter();
    const logout = useAdminAuth((s) => s.logout);

    const [state, setState] = useState<ViewState>("loading");
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [errMsg, setErrMsg] = useState("");

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"" | "active" | "inactive">("");

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<BankAccount | null>(null);
    const [deleting, setDeleting] = useState<BankAccount | null>(null);
    const [delLoading, setDelLoading] = useState(false);
    const [togglingId, setTogglingId] = useState<number | null>(null);

    async function load() {
        setState("loading");
        try {
            setAccounts(await getAdminBankAccounts());
            setState("ready");
        } catch (err) {
            const code = err instanceof Error ? err.message : "SERVER";
            if (code === "UNAUTHORIZED") { await logout(); router.replace("/login"); return; }
            setErrMsg(friendlyError(code));
            setState("error");
        }
    }
    useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    async function confirmDelete() {
        if (!deleting) return;
        setDelLoading(true);
        try {
            await deleteBankAccount(deleting.id);
            setDeleting(null);
            load();
        } catch (err) {
            const code = err instanceof Error ? err.message : "SERVER";
            if (code === "UNAUTHORIZED") { await logout(); router.replace("/login"); return; }
            alert(friendlyError(code));
        } finally {
            setDelLoading(false);
        }
    }

    async function toggleActive(acc: BankAccount) {
        const next = !acc.is_active;
        setTogglingId(acc.id);
        setAccounts((prev) => prev.map((a) => (a.id === acc.id ? { ...a, is_active: next } : a))); // optimistic
        try {
            await saveBankAccount(
                {
                    type: acc.type,
                    bank_name: acc.bank_name,
                    account_number: acc.account_number ?? undefined,
                    account_name: acc.account_name ?? undefined,
                    initial_balance: acc.initial_balance,
                    is_active: next,
                },
                acc.id
            );
        } catch (err) {
            setAccounts((prev) => prev.map((a) => (a.id === acc.id ? { ...a, is_active: acc.is_active } : a))); // revert
            const code = err instanceof Error ? err.message : "SERVER";
            if (code === "UNAUTHORIZED") { await logout(); router.replace("/login"); return; }
            alert(friendlyError(code));
        } finally {
            setTogglingId(null);
        }
    }

    const filtered = useMemo(() => {
        return accounts.filter((a) => {
            const q = search.toLowerCase();
            const matchSearch =
                !q ||
                a.bank_name.toLowerCase().includes(q) ||
                (a.account_name ?? "").toLowerCase().includes(q) ||
                (a.account_number ?? "").toLowerCase().includes(q);
            const matchStatus = !statusFilter || (statusFilter === "active" ? a.is_active : !a.is_active);
            return matchSearch && matchStatus;
        });
    }, [accounts, search, statusFilter]);

    const total = accounts.length;
    const activeCount = accounts.filter((a) => a.is_active).length;

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-on-surface">Rekening Bank</h2>
                    <p className="text-sm text-on-surface-variant mt-1">Kelola rekening tujuan donasi institusi.</p>
                </div>
                <button onClick={() => { setEditing(null); setFormOpen(true); }}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container transition-colors self-start sm:self-auto">
                    <Icon name="add" className="text-[18px]" /> Tambah Rekening Baru
                </button>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
                    <div className="w-10 h-10 rounded-lg bg-secondary-container text-primary flex items-center justify-center mb-3">
                        <Icon name="account_balance" className="text-[22px]" />
                    </div>
                    <p className="text-xs uppercase tracking-wide text-on-surface-variant">Total Rekening</p>
                    <p className="text-2xl font-bold text-on-surface mt-0.5">{total}</p>
                </div>
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
                    <div className="w-10 h-10 rounded-lg bg-primary text-on-primary flex items-center justify-center mb-3">
                        <Icon name="check_circle" filled className="text-[22px]" />
                    </div>
                    <p className="text-xs uppercase tracking-wide text-on-surface-variant">Rekening Aktif</p>
                    <p className="text-2xl font-bold text-on-surface mt-0.5">{activeCount} <span className="text-sm font-normal text-on-surface-variant">/ {total}</span></p>
                </div>
            </div>

            {/* Filter bar */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-t-xl border-b-0 p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="relative w-full sm:max-w-xs">
                    <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]" />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari bank / no rekening / atas nama..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                </div>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "" | "active" | "inactive")}
                    className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none">
                    <option value="">Status: Semua</option>
                    <option value="active">Status: Aktif</option>
                    <option value="inactive">Status: Nonaktif</option>
                </select>
            </div>

            {/* Konten */}
            {state === "loading" ? (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-b-xl p-5 animate-pulse">
                    {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 bg-surface-container rounded mb-2" />)}
                </div>
            ) : state === "error" ? (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-b-xl flex flex-col items-center justify-center text-center py-16">
                    <div className="w-14 h-14 rounded-full bg-error-container flex items-center justify-center text-on-error-container mb-4">
                        <Icon name="cloud_off" className="text-[28px]" />
                    </div>
                    <h3 className="text-lg font-semibold text-on-surface">Gagal Memuat Rekening</h3>
                    <p className="text-sm text-on-surface-variant mt-1">{errMsg}</p>
                    <button onClick={load} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container transition-colors">
                        <Icon name="refresh" className="text-[18px]" /> Coba Lagi
                    </button>
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-b-xl flex flex-col items-center justify-center text-center py-16">
                    <Icon name="account_balance" className="text-[40px] text-outline-variant mb-3" />
                    <h3 className="text-base font-semibold text-on-surface">Tidak Ada Rekening</h3>
                    <p className="text-sm text-on-surface-variant mt-1">{search || statusFilter ? "Tidak ada yang cocok dengan filter." : "Tambahkan rekening pertama Anda."}</p>
                </div>
            ) : (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-b-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm min-w-[820px]">
                            <thead>
                                <tr className="bg-surface-container-low/50 border-b border-outline-variant text-xs uppercase tracking-wide text-on-surface-variant">
                                    <th className="px-5 py-3 font-semibold">Channel</th>
                                    <th className="px-5 py-3 font-semibold">No Rekening</th>
                                    <th className="px-5 py-3 font-semibold">Atas Nama</th>
                                    <th className="px-5 py-3 font-semibold text-right">Saldo Awal</th>
                                    <th className="px-5 py-3 font-semibold">Status</th>
                                    <th className="px-5 py-3 font-semibold text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant/60">
                                {filtered.map((a) => {
                                    const isQris = a.type === "qris";
                                    const thumb = isQris ? a.qris_image_url : a.logo_url;
                                    return (
                                        <tr key={a.id} className="hover:bg-surface-container-low transition-colors">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg border border-outline-variant bg-surface flex items-center justify-center overflow-hidden shrink-0">
                                                        {thumb ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img src={thumb} alt={a.bank_name} className="w-full h-full object-contain p-1" />
                                                        ) : (
                                                            <Icon name={isQris ? "qr_code_2" : "account_balance"} className="text-[20px] text-primary" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-on-surface">{a.bank_name}</p>
                                                        <span className={`inline-flex mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${isQris ? "bg-secondary-container text-on-secondary-container" : "bg-surface-variant text-on-surface-variant"
                                                            }`}>
                                                            {isQris ? "QRIS" : "Bank"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 font-mono text-on-surface">{a.account_number ?? "—"}</td>
                                            <td className="px-5 py-4 text-on-surface-variant">{a.account_name ?? "—"}</td>
                                            <td className="px-5 py-4 text-right font-mono text-on-surface whitespace-nowrap">{formatRupiah(a.initial_balance)}</td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <button onClick={() => toggleActive(a)} disabled={togglingId === a.id} role="switch" aria-checked={a.is_active}
                                                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${a.is_active ? "bg-primary-container" : "bg-outline-variant"}`}>
                                                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${a.is_active ? "translate-x-[18px]" : "translate-x-1"}`} />
                                                    </button>
                                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${a.is_active ? "bg-primary-fixed text-on-primary-fixed-variant" : "bg-surface-variant text-on-surface-variant"}`}>
                                                        {a.is_active ? "Aktif" : "Nonaktif"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex justify-end gap-1">
                                                    <button onClick={() => { setEditing(a); setFormOpen(true); }} className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors" title="Edit">
                                                        <Icon name="edit" className="text-[18px]" />
                                                    </button>
                                                    <button onClick={() => setDeleting(a)} className="p-2 rounded-lg text-error hover:bg-error-container/30 transition-colors" title="Hapus">
                                                        <Icon name="delete" className="text-[18px]" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <BankAccountFormModal
                open={formOpen}
                account={editing}
                onClose={() => setFormOpen(false)}
                onSaved={() => { setFormOpen(false); load(); }}
            />
            <ConfirmDialog
                open={!!deleting}
                title="Hapus Rekening"
                message={`Yakin ingin menghapus rekening ${deleting?.bank_name} (${deleting?.account_name})? Akan diarsipkan (soft delete).`}
                confirmLabel="Hapus"
                loading={delLoading}
                onConfirm={confirmDelete}
                onClose={() => setDeleting(null)}
            />
        </div>
    );
}