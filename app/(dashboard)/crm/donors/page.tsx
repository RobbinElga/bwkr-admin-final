"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CrmDonor, DonorTier } from "@/types";
import { getCrmDonors, updateDonorTier } from "@/services/crm";
import { useAdminAuth } from "@/stores/auth";
import { friendlyError } from "@/lib/errors";
import { formatRupiah, formatDate } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ExportButton } from "@/components/ui/ExportButton";

type ViewState = "loading" | "ready" | "error";

function initials(name: string | null) {
    if (!name) return "?";
    return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

// normalisasi nomor utk wa.me (08xx -> 628xx)
function waNumber(phone: string | null) {
    if (!phone) return null;
    let p = phone.replace(/[^0-9]/g, "");
    if (p.startsWith("0")) p = "62" + p.slice(1);
    return p;
}

export default function CrmDonorsPage() {
    const router = useRouter();
    const logout = useAdminAuth((s) => s.logout);

    const user = useAdminAuth((s) => s.user);
    const canChangeTier = user?.role === "super_admin" || user?.role === "admin";

    const [state, setState] = useState<ViewState>("loading");
    const [rows, setRows] = useState<CrmDonor[]>([]);
    const [meta, setMeta] = useState<{ current_page: number; last_page: number; total: number } | null>(null);
    const [errMsg, setErrMsg] = useState("");

    const [search, setSearch] = useState("");
    const [tier, setTier] = useState<DonorTier | "">("");
    const [page, setPage] = useState(1);

    const [tierConfirm, setTierConfirm] = useState<{ donor: CrmDonor; next: DonorTier } | null>(null);
    const [tierLoading, setTierLoading] = useState(false);

    async function load() {
        setState("loading");
        try {
            const res = await getCrmDonors({ search, tier, page });
            setRows(res.data);
            setMeta({ current_page: res.meta.current_page, last_page: res.meta.last_page, total: res.meta.total });
            setState("ready");
        } catch (err) {
            const code = err instanceof Error ? err.message : "SERVER";
            if (code === "UNAUTHORIZED") { await logout(); router.replace("/login"); return; }
            setErrMsg(friendlyError(code));
            setState("error");
        }
    }
    useEffect(() => { load(); }, [page, tier]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        const t = setTimeout(() => { setPage(1); load(); }, 400);
        return () => clearTimeout(t);
    }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

    async function runTierChange() {
        if (!tierConfirm) return;
        setTierLoading(true);
        const { donor, next } = tierConfirm;
        setRows((prev) => prev.map((d) => (d.donor_phone_hash === donor.donor_phone_hash ? { ...d, tier: next } : d))); // optimistic
        try {
            await updateDonorTier(donor.donor_phone_hash, next);
            setTierConfirm(null);
        } catch (err) {
            setRows((prev) => prev.map((d) => (d.donor_phone_hash === donor.donor_phone_hash ? { ...d, tier: donor.tier } : d))); // revert
            const code = err instanceof Error ? err.message : "SERVER";
            if (code === "UNAUTHORIZED") { await logout(); router.replace("/login"); return; }
            alert(friendlyError(code));
        } finally {
            setTierLoading(false);
        }
    }

    const premiumCount = rows.filter((d) => d.tier === "premium").length;

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-on-surface">CRM Donatur</h2>
                    <p className="text-sm text-on-surface-variant mt-1">Kelola database donatur, tier, dan kontak WhatsApp.</p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <ExportButton path="crm/donors/export" name="laporan-donatur" params={{ search, tier }} />
                    <a href="/crm/broadcast"
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container transition-colors">
                        <Icon name="campaign" className="text-[18px]" /> Broadcast WA
                    </a>
                </div>
            </div>

            {/* Metric ringkas (halaman ini) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <MetricCard icon="group" label="Donatur (halaman ini)" value={String(rows.length)} accent="primary" />
                <MetricCard icon="workspace_premium" label="Premium (halaman ini)" value={String(premiumCount)} accent="tertiary" />
                <MetricCard icon="database" label="Total Donatur" value={meta ? meta.total.toLocaleString("id-ID") : "—"} accent="secondary" />
            </div>

            {/* Filter */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 mb-4 flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="relative w-full sm:max-w-md">
                    <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]" />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama atau no HP..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                </div>
                <select value={tier} onChange={(e) => { setTier(e.target.value as DonorTier | ""); setPage(1); }}
                    className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none">
                    <option value="">Semua Tier</option>
                    <option value="reguler">Reguler</option>
                    <option value="premium">Premium</option>
                </select>
            </div>

            {state === "loading" ? (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 animate-pulse">
                    {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-surface-container rounded mb-2" />)}
                </div>
            ) : state === "error" ? (
                <div className="flex flex-col items-center justify-center text-center py-16 border border-outline-variant rounded-xl bg-surface-container-lowest">
                    <div className="w-14 h-14 rounded-full bg-error-container flex items-center justify-center text-on-error-container mb-4"><Icon name="cloud_off" className="text-[28px]" /></div>
                    <h3 className="text-lg font-semibold text-on-surface">Gagal Memuat Data</h3>
                    <p className="text-sm text-on-surface-variant mt-1">{errMsg}</p>
                    <button onClick={load} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container transition-colors"><Icon name="refresh" className="text-[18px]" /> Coba Lagi</button>
                </div>
            ) : rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-16 border border-dashed border-outline-variant rounded-xl">
                    <Icon name="groups" className="text-[40px] text-outline-variant mb-3" />
                    <h3 className="text-base font-semibold text-on-surface">Belum Ada Donatur</h3>
                    <p className="text-sm text-on-surface-variant mt-1">{search || tier ? "Tidak ada yang cocok dengan filter." : "Donatur akan muncul setelah ada donasi masuk."}</p>
                </div>
            ) : (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm min-w-[860px]">
                            <thead>
                                <tr className="bg-surface-container-low/50 border-b border-outline-variant text-xs uppercase tracking-wide text-on-surface-variant">
                                    <th className="px-5 py-3 font-semibold">Donatur</th>
                                    <th className="px-5 py-3 font-semibold text-right">Total Donasi</th>
                                    <th className="px-5 py-3 font-semibold text-center">Frekuensi</th>
                                    <th className="px-5 py-3 font-semibold">Terakhir Donasi</th>
                                    <th className="px-5 py-3 font-semibold text-center">Tier</th>
                                    <th className="px-5 py-3 font-semibold text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant/60">
                                {rows.map((d) => {
                                    const wa = waNumber(d.phone);
                                    return (
                                        <tr key={d.donor_phone_hash} className="hover:bg-surface-container-low transition-colors">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-xs font-bold shrink-0">{initials(d.name)}</div>
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-on-surface line-clamp-1">{d.name ?? "Tanpa nama"}</p>
                                                        <p className="text-xs text-on-surface-variant font-mono">{d.phone ?? "—"}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-right font-mono text-on-surface whitespace-nowrap">{formatRupiah(d.total_donated)}</td>
                                            <td className="px-5 py-4 text-center text-on-surface-variant">{d.donation_count}×</td>
                                            <td className="px-5 py-4 text-on-surface-variant whitespace-nowrap">{d.last_donated_at ? formatDate(d.last_donated_at) : "—"}</td>
                                            <td className="px-5 py-4 text-center">
                                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${d.tier === "premium" ? "bg-tertiary-fixed text-on-tertiary-fixed-variant" : "bg-surface-variant text-on-surface-variant"
                                                    }`}>
                                                    {d.tier === "premium" ? "Premium" : "Reguler"}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <a href={`/crm/donors/${d.donor_phone_hash}`} title="Lihat detail"
                                                        className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/5 transition-colors">
                                                        <Icon name="visibility" className="text-[16px]" /> Detail
                                                    </a>
                                                    {wa && (
                                                        <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" title="Chat WhatsApp"
                                                            className="inline-flex items-center gap-1 rounded-lg bg-[#25D366] px-2.5 py-1.5 text-xs font-medium text-white hover:bg-[#1DA851] transition-colors">
                                                            <Icon name="chat" className="text-[16px]" /> WA
                                                        </a>
                                                    )}
                                                    {canChangeTier && (d.tier === "reguler" ? (
                                                        <button onClick={() => setTierConfirm({ donor: d, next: "premium" })} title="Jadikan Premium"
                                                            className="inline-flex items-center gap-1 rounded-lg border border-tertiary px-2.5 py-1.5 text-xs font-medium text-tertiary hover:bg-tertiary/5 transition-colors">
                                                            <Icon name="upgrade" className="text-[16px]" /> Upgrade
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => setTierConfirm({ donor: d, next: "reguler" })} title="Jadikan Reguler"
                                                            className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-2.5 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-surface-container transition-colors">
                                                            <Icon name="arrow_downward" className="text-[16px]" /> Reguler
                                                        </button>
                                                    ))}
                                                </div>
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

            <ConfirmDialog
                open={!!tierConfirm}
                title={tierConfirm?.next === "premium" ? "Upgrade ke Premium" : "Turunkan ke Reguler"}
                message={
                    tierConfirm?.next === "premium"
                        ? `Jadikan "${tierConfirm?.donor.name ?? "donatur ini"}" sebagai donatur Premium?`
                        : `Turunkan "${tierConfirm?.donor.name ?? "donatur ini"}" menjadi Reguler?`
                }
                confirmLabel={tierConfirm?.next === "premium" ? "Upgrade" : "Turunkan"}
                danger={tierConfirm?.next === "reguler"}
                loading={tierLoading}
                onConfirm={runTierChange}
                onClose={() => setTierConfirm(null)}
            />
        </div>
    );
}

function MetricCard({ icon, label, value, accent }: { icon: string; label: string; value: string; accent: "primary" | "tertiary" | "secondary" }) {
    const colors = {
        primary: "bg-primary/10 text-primary",
        tertiary: "bg-tertiary-container/15 text-tertiary",
        secondary: "bg-surface-container-high text-secondary",
    }[accent];
    return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colors}`}>
                <Icon name={icon} className="text-[22px]" />
            </div>
            <p className="text-xs uppercase tracking-wide text-on-surface-variant">{label}</p>
            <p className="text-xl font-bold text-on-surface mt-0.5 font-mono">{value}</p>
        </div>
    );
}