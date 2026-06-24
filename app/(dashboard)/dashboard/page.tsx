"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { DashboardStats, DonationTrendPoint, RecentDonation } from "@/types";
import { getDashboardStats, getDonationTrends, getRecentDonations } from "@/services/dashboard";
import { useAdminAuth } from "@/stores/auth";
import { formatRupiah } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { RecentDonations } from "@/components/dashboard/RecentDonations";
import { ExportButton } from "@/components/ui/ExportButton";

type ViewState = "loading" | "ready" | "error";


// Terjemahkan KODE error → kalimat aman untuk user
function friendlyError(code: string): string {
    switch (code) {
        case "NETWORK": return "Tidak dapat terhubung ke server. Periksa koneksi Anda.";
        case "SERVER": return "Terjadi kesalahan saat memuat data. Silakan coba lagi.";
        default: return "Terjadi kesalahan. Silakan coba lagi.";
    }
}

export default function DashboardPage() {
    const router = useRouter();
    const logout = useAdminAuth((s) => s.logout);

    const [state, setState] = useState<ViewState>("loading");
    const [data, setData] = useState<DashboardStats | null>(null);
    const [trends, setTrends] = useState<DonationTrendPoint[]>([]);
    const [recent, setRecent] = useState<RecentDonation[]>([]);
    const [errMsg, setErrMsg] = useState("");

    async function load() {
        setState("loading");
        try {
            // Data utama — wajib berhasil
            const stats = await getDashboardStats();
            setData(stats);

            // Data sekunder — kalau gagal, biarkan kosong (jangan gagalkan halaman)
            const [t, r] = await Promise.all([
                getDonationTrends(12).catch(() => []),
                getRecentDonations(5).catch(() => []),
            ]);
            setTrends(t);
            setRecent(r);

            setState("ready");
        } catch (err) {
            const code = err instanceof Error ? err.message : "SERVER";
            if (code === "UNAUTHORIZED") {
                await logout();
                router.replace("/login");
                return;
            }
            setErrMsg(friendlyError(code));
            setState("error");
        }
    }

    useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    if (state === "loading") return <DashboardSkeleton />;

    if (state === "error") {
        return (
            <div className="flex flex-col items-center justify-center text-center py-20">
                <div className="w-14 h-14 rounded-full bg-error-container flex items-center justify-center text-on-error-container mb-4">
                    <Icon name="cloud_off" className="text-[28px]" />
                </div>
                <h3 className="text-lg font-semibold text-on-surface">Gagal Memuat Dashboard</h3>
                <p className="text-sm text-on-surface-variant mt-1 max-w-sm">{errMsg}</p>
                <button
                    onClick={load}
                    className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container transition-colors"
                >
                    <Icon name="refresh" className="text-[18px]" /> Coba Lagi
                </button>
            </div>
        );
    }

    const d = data!;

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-on-surface">Ringkasan Dashboard</h2>
                    <p className="text-sm text-on-surface-variant mt-1">
                        Pantau kinerja dan metrik utama wakaf BWKR.
                    </p>
                </div>
                <ExportButton path="dashboard/export" name="ringkasan-dashboard" />
            </div>
            {/* 4 Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatCard icon="account_balance_wallet" label="Total Terkumpul" value={formatRupiah(d.funds.total_raised)} />
                <StatCard icon="payments" label="Dana Tersalurkan" value={formatRupiah(d.funds.total_disbursed)} />
                <StatCard icon="savings" label="Sisa Dana" value={formatRupiah(d.funds.remaining)} />
                <StatCard icon="groups" label="Total Donatur" value={d.donors.total.toLocaleString("id-ID")} sub="Berdasarkan no. HP unik" />
            </div>

            {/* 2 kolom: status operasional + saldo rekening */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Status operasional */}
                <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
                    <h3 className="text-base font-semibold text-on-surface mb-4">Status Operasional</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <MiniStat icon="account_tree" label="Program Aktif" value={d.programs.active} />
                        <MiniStat icon="folder_open" label="Total Proyek" value={d.projects.total} />
                        <MiniStat icon="construction" label="Proyek Berjalan" value={d.projects.running} />
                        <MiniStat icon="task_alt" label="Proyek Selesai" value={d.projects.completed} />
                        <MiniStat icon="badge" label="Staff Aktif" value={d.staff_active} />
                    </div>
                </div>

                {/* Saldo per rekening */}
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
                    <h3 className="text-base font-semibold text-on-surface mb-4">Saldo per Rekening</h3>
                    {d.balance_per_account.length === 0 ? (
                        <p className="text-sm text-on-surface-variant">Belum ada rekening aktif.</p>
                    ) : (
                        <ul className="space-y-2.5">
                            {d.balance_per_account.map((acc) => (
                                <li key={acc.id} className="flex items-center justify-between gap-3 bg-surface-container-low rounded-lg px-3 py-2.5">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Icon name="account_balance" className="text-[20px] text-primary shrink-0" />
                                        <span className="text-sm text-on-surface truncate">{acc.bank_name}</span>
                                    </div>
                                    <span className="text-sm font-semibold text-on-surface font-mono whitespace-nowrap">
                                        {formatRupiah(acc.balance)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                {/* Chart tren donasi */}
                <div className="mt-4">
                    <TrendChart data={trends} />
                </div>

                {/* Tabel transaksi terbaru */}
                <div className="mt-4 lg:col-span-2">
                    <RecentDonations data={recent} />
                </div>
            </div>
        </div>
    );
}

/* ---------- Sub-komponen ---------- */

function StatCard({ icon, label, value, sub }: {
    icon: string; label: string; value: string; sub?: string;
}) {
    return (
        <div className="relative overflow-hidden bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
            <div className="absolute -top-2 -right-2 opacity-[0.06] pointer-events-none">
                <Icon name={icon} className="text-[80px] text-primary" />
            </div>
            <div className="relative">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                    <Icon name={icon} className="text-[22px]" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{label}</p>
                <p className="text-2xl font-bold text-on-surface mt-1 break-words">{value}</p>
                {sub && <p className="text-xs text-on-surface-variant mt-1.5">{sub}</p>}
            </div>
        </div>
    );
}

function MiniStat({ icon, label, value }: { icon: string; label: string; value: number }) {
    return (
        <div className="bg-surface-container-low rounded-lg p-3 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-on-surface-variant">
                <Icon name={icon} className="text-[18px]" />
                <span className="text-xs">{label}</span>
            </div>
            <span className="text-xl font-bold text-on-surface">{value.toLocaleString("id-ID")}</span>
        </div>
    );
}