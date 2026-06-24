"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import type { CrmDonorDetail, DonorTier, DonationInput } from "@/types";
import { getCrmDonor, updateDonorTier } from "@/services/crm";
import { useAdminAuth } from "@/stores/auth";
import { friendlyError } from "@/lib/errors";
import { formatRupiah, formatDate } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type ViewState = "loading" | "ready" | "error";

function initials(name: string | null) {
    if (!name) return "?";
    return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}
function waNumber(phone: string | null) {
    if (!phone) return null;
    let p = phone.replace(/[^0-9]/g, "");
    if (p.startsWith("0")) p = "62" + p.slice(1);
    return p;
}

const DON_STATUS: Record<string, { label: string; cls: string }> = {
    pending: { label: "Pending", cls: "bg-tertiary-container/15 text-tertiary" },
    claimed: { label: "Tersalur", cls: "bg-primary/10 text-primary" },
    rejected: { label: "Ditolak", cls: "bg-error/10 text-error" },
};

export default function CrmDonorDetailPage() {
    const router = useRouter();
    const params = useParams<{ hash: string }>();
    const hash = params.hash;
    const logout = useAdminAuth((s) => s.logout);
    const user = useAdminAuth((s) => s.user);
    const canChangeTier = user?.role === "super_admin" || user?.role === "admin";

    const [state, setState] = useState<ViewState>("loading");
    const [data, setData] = useState<CrmDonorDetail | null>(null);
    const [errMsg, setErrMsg] = useState("");
    const [tierConfirm, setTierConfirm] = useState<DonorTier | null>(null);
    const [tierLoading, setTierLoading] = useState(false);

    async function load() {
        setState("loading");
        try {
            setData(await getCrmDonor(hash));
            setState("ready");
        } catch (err) {
            const code = err instanceof Error ? err.message : "SERVER";
            if (code === "UNAUTHORIZED") { await logout(); router.replace("/login"); return; }
            setErrMsg(code === "SERVER" ? "Donatur tidak ditemukan." : friendlyError(code));
            setState("error");
        }
    }
    useEffect(() => { load(); }, [hash]); // eslint-disable-line react-hooks/exhaustive-deps

    async function runTierChange() {
        if (!tierConfirm || !data) return;
        setTierLoading(true);
        try {
            await updateDonorTier(hash, tierConfirm);
            setData({ ...data, donor: { ...data.donor, tier: tierConfirm } });
            setTierConfirm(null);
        } catch (err) {
            const code = err instanceof Error ? err.message : "SERVER";
            if (code === "UNAUTHORIZED") { await logout(); router.replace("/login"); return; }
            alert(friendlyError(code));
        } finally {
            setTierLoading(false);
        }
    }

    if (state === "loading") {
        return (
            <div className="animate-pulse space-y-4">
                <div className="h-8 w-40 bg-surface-container rounded" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="h-64 bg-surface-container rounded-xl" />
                    <div className="lg:col-span-2 h-64 bg-surface-container rounded-xl" />
                </div>
            </div>
        );
    }
    if (state === "error" || !data) {
        return (
            <div className="flex flex-col items-center justify-center text-center py-20">
                <div className="w-14 h-14 rounded-full bg-error-container flex items-center justify-center text-on-error-container mb-4"><Icon name="person_off" className="text-[28px]" /></div>
                <h3 className="text-lg font-semibold text-on-surface">{errMsg}</h3>
                <button onClick={() => router.push("/crm/donors")} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container transition-colors">
                    <Icon name="arrow_back" className="text-[18px]" /> Kembali ke Daftar
                </button>
            </div>
        );
    }

    const { donor, donations } = data;
    const wa = waNumber(donor.phone);

    return (
        <div>
            <button onClick={() => router.push("/crm/donors")} className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary transition-colors mb-5">
                <Icon name="arrow_back" className="text-[18px]" /> Kembali ke Daftar Donatur
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
                {/* Kolom kiri: profil */}
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-20 h-20 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-2xl font-bold mb-3">{initials(donor.name)}</div>
                        <h2 className="text-lg font-bold text-on-surface">{donor.name ?? "Tanpa nama"}</h2>
                        <p className="text-sm text-on-surface-variant font-mono mt-0.5">{donor.phone ?? "—"}</p>
                        <span className={`mt-3 inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${donor.tier === "premium" ? "bg-tertiary-fixed text-on-tertiary-fixed-variant" : "bg-surface-variant text-on-surface-variant"
                            }`}>
                            {donor.tier === "premium" ? "Premium" : "Reguler"}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-6">
                        <div className="rounded-lg bg-surface-container-low p-3 text-center">
                            <p className="text-xs text-on-surface-variant">Total Donasi</p>
                            <p className="text-base font-bold text-primary font-mono mt-0.5">{formatRupiah(donor.total_donated)}</p>
                        </div>
                        <div className="rounded-lg bg-surface-container-low p-3 text-center">
                            <p className="text-xs text-on-surface-variant">Jumlah Donasi</p>
                            <p className="text-base font-bold text-on-surface font-mono mt-0.5">{donor.donation_count}×</p>
                        </div>
                    </div>

                    {donor.notes && (
                        <div className="mt-4 rounded-lg border border-outline-variant/60 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-1">Catatan</p>
                            <p className="text-sm text-on-surface">{donor.notes}</p>
                        </div>
                    )}

                    <div className="mt-6 flex flex-col gap-2">
                        {wa && (
                            <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1DA851] transition-colors">
                                <Icon name="chat" className="text-[18px]" /> Chat WhatsApp
                            </a>
                        )}
                        {canChangeTier && (
                            donor.tier === "reguler" ? (
                                <button onClick={() => setTierConfirm("premium")}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-tertiary px-4 py-2.5 text-sm font-semibold text-tertiary hover:bg-tertiary/5 transition-colors">
                                    <Icon name="upgrade" className="text-[18px]" /> Upgrade ke Premium
                                </button>
                            ) : (
                                <button onClick={() => setTierConfirm("reguler")}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-colors">
                                    <Icon name="arrow_downward" className="text-[18px]" /> Turunkan ke Reguler
                                </button>
                            )
                        )}
                    </div>
                </div>

                {/* Kolom kanan: riwayat donasi */}
                <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.04)] overflow-hidden">
                    <div className="px-5 py-4 border-b border-outline-variant flex items-center gap-2">
                        <Icon name="history" className="text-[20px] text-primary" />
                        <h3 className="text-base font-semibold text-on-surface">Riwayat Donasi</h3>
                        <span className="ml-auto text-xs text-on-surface-variant">{donations.length} transaksi</span>
                    </div>

                    {donations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center py-14">
                            <Icon name="inbox" className="text-[36px] text-outline-variant mb-2" />
                            <p className="text-sm text-on-surface-variant">Belum ada riwayat donasi.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm min-w-[560px]">
                                <thead>
                                    <tr className="bg-surface-container-low/50 border-b border-outline-variant text-xs uppercase tracking-wide text-on-surface-variant">
                                        <th className="px-5 py-3 font-semibold">No. Ref</th>
                                        <th className="px-5 py-3 font-semibold text-right">Nominal</th>
                                        <th className="px-5 py-3 font-semibold text-center">Status</th>
                                        <th className="px-5 py-3 font-semibold">Tanggal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-outline-variant/60">
                                    {donations.map((d: DonationInput) => {
                                        const st = DON_STATUS[d.status] ?? DON_STATUS.pending;
                                        return (
                                            <tr key={d.id} className="hover:bg-surface-container-low transition-colors">
                                                <td className="px-5 py-3.5 font-mono text-on-surface-variant">{d.ref_no}</td>
                                                <td className="px-5 py-3.5 text-right font-mono text-on-surface whitespace-nowrap">{formatRupiah(d.amount)}</td>
                                                <td className="px-5 py-3.5 text-center">
                                                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>{st.label}</span>
                                                </td>
                                                <td className="px-5 py-3.5 text-on-surface-variant whitespace-nowrap">{formatDate(d.created_at)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmDialog
                open={!!tierConfirm}
                title={tierConfirm === "premium" ? "Upgrade ke Premium" : "Turunkan ke Reguler"}
                message={
                    tierConfirm === "premium"
                        ? `Jadikan "${donor.name ?? "donatur ini"}" sebagai donatur Premium?`
                        : `Turunkan "${donor.name ?? "donatur ini"}" menjadi Reguler?`
                }
                confirmLabel={tierConfirm === "premium" ? "Upgrade" : "Turunkan"}
                danger={tierConfirm === "reguler"}
                loading={tierLoading}
                onConfirm={runTierChange}
                onClose={() => setTierConfirm(null)}
            />
        </div>
    );
}