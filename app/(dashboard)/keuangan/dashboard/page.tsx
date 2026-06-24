"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    getKeuanganDashboard,
    type KeuanganDashboard,
    type TrenBulan,
} from "@/services/keuangan";
import { useAdminAuth } from "@/stores/auth";
import { friendlyError } from "@/lib/errors";
import { formatRupiah } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";

type ViewState = "loading" | "ready" | "error";

function monthLabel(ym: string): string {
    const [y, m] = ym.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("id-ID", { month: "short" });
}

export default function DashboardKeuanganPage() {
    const router = useRouter();
    const logout = useAdminAuth((s) => s.logout);

    const [state, setState] = useState<ViewState>("loading");
    const [data, setData] = useState<KeuanganDashboard | null>(null);
    const [errMsg, setErrMsg] = useState("");

    async function load() {
        setState("loading");
        try {
            setData(await getKeuanganDashboard());
            setState("ready");
        } catch (err) {
            const code = err instanceof Error ? err.message : "SERVER";
            if (code === "UNAUTHORIZED") { await logout(); router.replace("/login"); return; }
            setErrMsg(friendlyError(code));
            setState("error");
        }
    }

    useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    if (state === "loading") {
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[0, 1, 2].map((i) => <div key={i} className="h-28 rounded-xl bg-surface-container-low animate-pulse" />)}
                </div>
                <div className="h-72 rounded-xl bg-surface-container-low animate-pulse" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="h-64 rounded-xl bg-surface-container-low animate-pulse" />
                    <div className="h-64 rounded-xl bg-surface-container-low animate-pulse" />
                </div>
            </div>
        );
    }

    if (state === "error") {
        return (
            <div className="flex flex-col items-center justify-center text-center py-20">
                <div className="w-14 h-14 rounded-full bg-error-container flex items-center justify-center text-on-error-container mb-4">
                    <Icon name="cloud_off" className="text-[28px]" />
                </div>
                <h3 className="text-lg font-semibold text-on-surface">Gagal Memuat Dashboard Keuangan</h3>
                <p className="text-sm text-on-surface-variant mt-1 max-w-sm">{errMsg}</p>
                <button onClick={load} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container transition-colors">
                    <Icon name="refresh" className="text-[18px]" /> Coba Lagi
                </button>
            </div>
        );
    }

    const d = data!;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-on-surface">Dashboard Keuangan</h2>
                <p className="text-sm text-on-surface-variant mt-1">Ringkasan kas, tren bulanan, dan rincian dana.</p>
            </div>

            {/* Ringkasan */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard icon="south_west" label="Total Masuk" value={formatRupiah(d.ringkasan.total_masuk)} tone="text-emerald-600" />
                <StatCard icon="north_east" label="Total Keluar" value={formatRupiah(d.ringkasan.total_keluar)} tone="text-rose-600" />
                <StatCard icon="account_balance" label="Saldo Kas" value={formatRupiah(d.ringkasan.saldo)} tone="text-primary" />
            </div>

            {/* Tren masuk vs keluar */}
            <TrenKeuanganChart data={d.tren} />

            {/* Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <BreakdownCard
                    title="Donasi per Program" icon="account_tree" barTone="bg-emerald-500/70"
                    rows={d.per_program.map((p) => ({ label: p.nama, value: p.total }))}
                    empty="Belum ada donasi terverifikasi."
                />
                <BreakdownCard
                    title="Pengeluaran per Kategori" icon="receipt_long" barTone="bg-rose-400/70"
                    rows={d.per_kategori.map((k) => ({ label: k.kategori, value: k.total }))}
                    empty="Belum ada pengeluaran."
                />
            </div>
        </div>
    );
}

/* ---------- Sub-komponen ---------- */

function StatCard({ icon, label, value, tone }: { icon: string; label: string; value: string; tone: string }) {
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
                <p className={`text-2xl font-bold mt-1 break-words ${tone}`}>{value}</p>
            </div>
        </div>
    );
}

function TrenKeuanganChart({ data }: { data: TrenBulan[] }) {
    const max = Math.max(...data.flatMap((d) => [d.masuk, d.keluar]), 1);
    const hasData = data.some((d) => d.masuk > 0 || d.keluar > 0);

    return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-semibold text-on-surface">Tren Kas (12 bulan)</h3>
                <div className="flex items-center gap-4 text-xs text-on-surface-variant">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/80" /> Masuk</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-rose-400/80" /> Keluar</span>
                </div>
            </div>

            {!hasData ? (
                <div className="h-48 flex flex-col items-center justify-center gap-2 text-on-surface-variant">
                    <Icon name="bar_chart" className="text-[36px] opacity-40" />
                    <p className="text-sm">Belum ada transaksi.</p>
                </div>
            ) : (
                <div className="h-56 flex gap-2">
                    {data.map((d) => {
                        const hMasuk = Math.max((d.masuk / max) * 100, d.masuk > 0 ? 2 : 0);
                        const hKeluar = Math.max((d.keluar / max) * 100, d.keluar > 0 ? 2 : 0);
                        return (
                            <div key={d.bulan} className="flex-1 flex flex-col">
                                <div className="flex-1 flex items-end justify-center gap-0.5 relative group">
                                    <span className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] bg-inverse-surface text-inverse-on-surface px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                        <span className="block">Masuk: {formatRupiah(d.masuk)}</span>
                                        <span className="block">Keluar: {formatRupiah(d.keluar)}</span>
                                    </span>
                                    <div className="w-1/2 max-w-[14px] rounded-t bg-emerald-500/70 group-hover:bg-emerald-500 transition-colors" style={{ height: `${hMasuk}%` }} />
                                    <div className="w-1/2 max-w-[14px] rounded-t bg-rose-400/70 group-hover:bg-rose-400 transition-colors" style={{ height: `${hKeluar}%` }} />
                                </div>
                                <span className="text-[10px] text-center text-on-surface-variant mt-1.5">{monthLabel(d.bulan)}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function BreakdownCard({ title, icon, rows, empty, barTone }: {
    title: string; icon: string; rows: { label: string; value: number }[]; empty: string; barTone: string;
}) {
    const max = Math.max(...rows.map((r) => r.value), 1);
    return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
            <h3 className="text-base font-semibold text-on-surface mb-4 flex items-center gap-2">
                <Icon name={icon} className="text-[20px] text-primary" /> {title}
            </h3>
            {rows.length === 0 ? (
                <p className="text-sm text-on-surface-variant">{empty}</p>
            ) : (
                <ul className="space-y-3">
                    {rows.map((r, i) => (
                        <li key={i}>
                            <div className="flex items-center justify-between gap-3 mb-1">
                                <span className="text-sm text-on-surface truncate">{r.label}</span>
                                <span className="text-sm font-semibold text-on-surface font-mono whitespace-nowrap">{formatRupiah(r.value)}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-surface-container-low overflow-hidden">
                                <div className={`h-full rounded-full ${barTone}`} style={{ width: `${(r.value / max) * 100}%` }} />
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}