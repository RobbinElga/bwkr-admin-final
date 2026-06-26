"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { LedgerEntry, LedgerSummary, DonationInput, DonationStatus } from "@/types";
import { getCashLedger } from "@/services/ledger";
import { getDonationInputs } from "@/services/donation";
import { useAdminAuth } from "@/stores/auth";
import { friendlyError } from "@/lib/errors";
import { formatRupiah, formatDate } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { getDonationProof } from "@/services/claim";
import { DonationDetailModal } from "@/components/donation/DonationDetailModal";

type Tab = "kas" | "donasi";
type ViewState = "loading" | "ready" | "error";

const DON_STATUS: Record<DonationStatus, { label: string; cls: string }> = {
    pending: { label: "Pending", cls: "bg-tertiary-container/10 text-tertiary-container" },
    claimed: { label: "Diklaim", cls: "bg-primary/10 text-primary" },
    rejected: { label: "Ditolak", cls: "bg-error/10 text-error" },
};

export default function RiwayatPage() {
    const router = useRouter();
    const logout = useAdminAuth((s) => s.logout);
    const [tab, setTab] = useState<Tab>("kas");
    const [errMsg, setErrMsg] = useState("");

    // Buku kas
    const [kasState, setKasState] = useState<ViewState>("loading");
    const [ledger, setLedger] = useState<LedgerEntry[]>([]);
    const [summary, setSummary] = useState<LedgerSummary | null>(null);

    // Donasi
    const [donState, setDonState] = useState<ViewState>("loading");
    const [rows, setRows] = useState<DonationInput[]>([]);
    const [meta, setMeta] = useState<{ current_page: number; last_page: number } | null>(null);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<DonationStatus | "">("");
    const [page, setPage] = useState(1);
    const [detail, setDetail] = useState<DonationInput | null>(null);

    function handleErr(err: unknown, setS: (v: ViewState) => void) {
        const code = err instanceof Error ? err.message : "SERVER";
        if (code === "UNAUTHORIZED") { logout(); router.replace("/login"); return; }
        setErrMsg(friendlyError(code)); setS("error");
    }

    async function loadKas() {
        setKasState("loading");
        try {
            const res = await getCashLedger();
            setLedger(res.data); setSummary(res.summary);
            setKasState("ready");
        } catch (err) { handleErr(err, setKasState); }
    }
    async function loadDon() {
        setDonState("loading");
        try {
            const res = await getDonationInputs({ search, status, page });
            setRows(res.data);
            setMeta({ current_page: res.meta.current_page, last_page: res.meta.last_page });
            setDonState("ready");
        } catch (err) { handleErr(err, setDonState); }
    }

    async function viewProof(id: number) {
        try {
            const url = await getDonationProof(id);
            window.open(url, "_blank", "noopener,noreferrer");
        } catch {
            alert("Gagal memuat bukti transfer.");
        }
    }

    useEffect(() => { if (tab === "kas") loadKas(); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { if (tab === "donasi") loadDon(); }, [tab, page, status]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (tab !== "donasi") return;
        const t = setTimeout(() => { setPage(1); loadDon(); }, 400);
        return () => clearTimeout(t);
    }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-on-surface">Riwayat Transaksi</h2>
                <p className="text-sm text-on-surface-variant mt-1">Buku kas masuk/keluar dan seluruh riwayat donasi.</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b border-outline-variant">
                {([["kas", "Buku Kas"], ["donasi", "Semua Donasi"]] as const).map(([key, label]) => (
                    <button key={key} onClick={() => setTab(key)}
                        className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${tab === key ? "text-primary border-primary" : "text-on-surface-variant border-transparent hover:text-primary"}`}>
                        {label}
                    </button>
                ))}
            </div>

            {/* ===== TAB BUKU KAS ===== */}
            {tab === "kas" && (
                kasState === "loading" ? (
                    <div className="h-64 bg-surface-container rounded-xl animate-pulse" />
                ) : kasState === "error" ? (
                    <ErrorBox msg={errMsg} onRetry={loadKas} />
                ) : (
                    <>
                        {summary && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                                <SumCard label="Total Masuk" value={formatRupiah(summary.total_masuk)} cls="text-primary" icon="south_west" />
                                <SumCard label="Total Keluar" value={formatRupiah(summary.total_keluar)} cls="text-error" icon="north_east" />
                                <SumCard label="Saldo" value={formatRupiah(summary.saldo)} cls="text-on-surface" icon="account_balance_wallet" />
                            </div>
                        )}
                        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm min-w-[680px]">
                                    <thead>
                                        <tr className="bg-surface-container-low/50 border-b border-outline-variant text-xs uppercase tracking-wide text-on-surface-variant">
                                            <th className="px-5 py-3 font-semibold">Tanggal</th>
                                            <th className="px-5 py-3 font-semibold text-center">Bukti</th>
                                            <th className="px-5 py-3 font-semibold">Keterangan</th>
                                            <th className="px-5 py-3 font-semibold text-center">Tipe</th>
                                            <th className="px-5 py-3 font-semibold text-right">Nominal</th>
                                            <th className="px-5 py-3 font-semibold text-right">Saldo</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-outline-variant/60">
                                        {ledger.length === 0 ? (
                                            <tr><td colSpan={5} className="py-12 text-center text-on-surface-variant">Belum ada transaksi.</td></tr>
                                        ) : ledger.map((e, i) => (
                                            <tr key={i} className="hover:bg-surface-container-low transition-colors">
                                                <td className="px-5 py-3 text-on-surface-variant whitespace-nowrap">{formatDate(e.date)}</td>
                                                <td className="px-5 py-3 text-on-surface">{e.description}{e.ref && <span className="ml-2 font-mono text-xs text-primary">{e.ref}</span>}</td>
                                                <td className="px-5 py-3 text-center">
                                                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${e.type === "masuk" ? "bg-primary/10 text-primary" : "bg-error/10 text-error"}`}>
                                                        {e.type === "masuk" ? "Masuk" : "Keluar"}
                                                    </span>
                                                </td>
                                                <td className={`px-5 py-3 text-right font-mono whitespace-nowrap ${e.type === "masuk" ? "text-primary" : "text-error"}`}>
                                                    {e.type === "masuk" ? "+" : "−"}{formatRupiah(e.amount)}
                                                </td>
                                                <td className="px-5 py-3 text-right font-mono text-on-surface whitespace-nowrap">{formatRupiah(e.balance)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )
            )}

            {/* ===== TAB SEMUA DONASI ===== */}
            {tab === "donasi" && (
                <>
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 mb-4 flex flex-col sm:flex-row gap-3 sm:items-center">
                        <div className="relative w-full sm:max-w-xs">
                            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]" />
                            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama wakif..."
                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                        </div>
                        <select value={status} onChange={(e) => { setStatus(e.target.value as DonationStatus | ""); setPage(1); }}
                            className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none">
                            <option value="">Semua Status</option>
                            <option value="pending">Pending</option>
                            <option value="claimed">Diklaim</option>
                            <option value="rejected">Ditolak</option>
                        </select>
                    </div>

                    {donState === "loading" ? (
                        <div className="h-64 bg-surface-container rounded-xl animate-pulse" />
                    ) : donState === "error" ? (
                        <ErrorBox msg={errMsg} onRetry={loadDon} />
                    ) : (
                        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm min-w-[720px]">
                                    <thead>
                                        <tr className="bg-surface-container-low/50 border-b border-outline-variant text-xs uppercase tracking-wide text-on-surface-variant">
                                            <th className="px-5 py-3 font-semibold">Ref</th>
                                            <th className="px-5 py-3 font-semibold">Wakif</th>
                                            <th className="px-5 py-3 font-semibold text-right">Nominal</th>
                                            <th className="px-5 py-3 font-semibold text-center">Status</th>
                                            <th className="px-5 py-3 font-semibold text-right">Tanggal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-outline-variant/60">
                                        {rows.length === 0 ? (
                                            <tr><td colSpan={6} className="py-12 text-center text-on-surface-variant">Tidak ada donasi.</td></tr>
                                        ) : rows.map((d) => {
                                            const s = DON_STATUS[d.status] ?? DON_STATUS.pending;
                                            return (
                                                <tr key={d.id} onClick={() => setDetail(d)} className="hover:bg-surface-container-low transition-colors cursor-pointer">
                                                    <td className="px-5 py-3 font-mono text-primary whitespace-nowrap">{d.ref_no}</td>
                                                    <td className="px-5 py-3 font-medium text-on-surface whitespace-nowrap">{d.donor_name}</td>
                                                    <td className="px-5 py-3 text-right font-mono text-on-surface whitespace-nowrap">{formatRupiah(d.amount)}</td>
                                                    <td className="px-5 py-3 text-center"><span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span></td>
                                                    <td className="px-5 py-3 text-right text-on-surface-variant whitespace-nowrap">{formatDate(d.created_at)}</td>
                                                    <td className="px-5 py-3 text-center">
                                                        {d.has_proof ? (
                                                            <button onClick={(e) => { e.stopPropagation(); viewProof(d.id) }} title="Lihat bukti transfer"
                                                                className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors">
                                                                <Icon name="description" className="text-[20px]" />
                                                            </button>
                                                        ) : (
                                                            <Icon name="remove" className="text-[18px] text-outline-variant" />
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            {meta && meta.last_page > 1 && (
                                <div className="flex items-center justify-center gap-3 py-4 border-t border-outline-variant">
                                    <button disabled={meta.current_page <= 1} onClick={() => setPage((p) => p - 1)}
                                        className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-3 py-1.5 text-sm text-on-surface hover:bg-surface-container disabled:opacity-40 transition-colors">
                                        <Icon name="chevron_left" className="text-[18px]" /> Sebelumnya
                                    </button>
                                    <span className="text-sm text-on-surface-variant">Hal {meta.current_page} / {meta.last_page}</span>
                                    <button disabled={meta.current_page >= meta.last_page} onClick={() => setPage((p) => p + 1)}
                                        className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-3 py-1.5 text-sm text-on-surface hover:bg-surface-container disabled:opacity-40 transition-colors">
                                        Berikutnya <Icon name="chevron_right" className="text-[18px]" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
            <DonationDetailModal open={!!detail} donation={detail} onClose={() => setDetail(null)} />
        </div>
    );
}

function SumCard({ label, value, cls, icon }: { label: string; value: string; cls: string; icon: string }) {
    return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2 text-on-surface-variant mb-2">
                <Icon name={icon} className="text-[20px]" /> <span className="text-xs uppercase tracking-wide">{label}</span>
            </div>
            <p className={`text-xl font-bold font-mono ${cls}`}>{value}</p>
        </div>
    );
}

function ErrorBox({ msg, onRetry }: { msg: string; onRetry: () => void }) {
    return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col items-center justify-center text-center py-16">
            <Icon name="cloud_off" className="text-[40px] text-error mb-3" />
            <p className="text-sm text-on-surface-variant">{msg}</p>
            <button onClick={onRetry} className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary">Coba Lagi</button>
        </div>
    );
}