"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Claim } from "@/types";
import { getClaims, approveClaim, rejectClaim } from "@/services/claim";
import { useAdminAuth } from "@/stores/auth";
import { friendlyError } from "@/lib/errors";
import { formatRupiah, formatDate } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type ViewState = "loading" | "ready" | "error";

export function PendingClaims({ onChanged }: { onChanged?: () => void }) {
    const router = useRouter();
    const logout = useAdminAuth((s) => s.logout);
    const user = useAdminAuth((s) => s.user);
    const canApprove = user?.role === "super_admin" || user?.role === "admin";

    const [state, setState] = useState<ViewState>("loading");
    const [claims, setClaims] = useState<Claim[]>([]);
    const [errMsg, setErrMsg] = useState("");
    const [confirm, setConfirm] = useState<{ claim: Claim; action: "approve" | "reject" } | null>(null);
    const [confirmLoading, setConfirmLoading] = useState(false);

    async function load() {
        setState("loading");
        try {
            const res = await getClaims({ status: "pending" });
            setClaims(res.data);
            setState("ready");
        } catch (err) {
            const code = err instanceof Error ? err.message : "SERVER";
            if (code === "UNAUTHORIZED") { await logout(); router.replace("/login"); return; }
            setErrMsg(friendlyError(code));
            setState("error");
        }
    }
    useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    async function runConfirm() {
        if (!confirm) return;
        setConfirmLoading(true);
        try {
            if (confirm.action === "approve") await approveClaim(confirm.claim.id);
            else await rejectClaim(confirm.claim.id);
            setConfirm(null);
            load();
            onChanged?.();
        } catch (err) {
            const code = err instanceof Error ? err.message : "SERVER";
            if (code === "UNAUTHORIZED") { await logout(); router.replace("/login"); return; }
            alert(friendlyError(code));
        } finally {
            setConfirmLoading(false);
        }
    }

    if (state === "loading") {
        return (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 animate-pulse">
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 bg-surface-container rounded mb-2" />)}
            </div>
        );
    }
    if (state === "error") {
        return (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col items-center justify-center text-center py-12">
                <Icon name="cloud_off" className="text-[32px] text-error mb-2" />
                <p className="text-sm text-on-surface-variant">{errMsg}</p>
                <button onClick={load} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-container transition-colors">
                    <Icon name="refresh" className="text-[18px]" /> Coba Lagi
                </button>
            </div>
        );
    }
    if (claims.length === 0) {
        return (
            <div className="border border-dashed border-outline-variant rounded-xl flex flex-col items-center justify-center text-center py-12">
                <Icon name="inbox" className="text-[36px] text-outline-variant mb-2" />
                <p className="text-sm text-on-surface-variant">Tidak ada klaim yang menunggu persetujuan.</p>
            </div>
        );
    }

    return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[760px]">
                    <thead>
                        <tr className="border-b border-outline-variant bg-surface-container-low/50 text-xs uppercase tracking-wide text-on-surface-variant">
                            <th className="px-5 py-3 font-semibold">Wakif</th>
                            <th className="px-5 py-3 font-semibold">Project</th>
                            <th className="px-5 py-3 font-semibold text-right">Nominal</th>
                            <th className="px-5 py-3 font-semibold">Tanggal</th>
                            <th className="px-5 py-3 font-semibold text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/60">
                        {claims.map((c) => (
                            <tr key={c.id} className="hover:bg-surface-container-low transition-colors">
                                <td className="px-5 py-4 font-medium text-on-surface">{c.donation?.donor_name ?? "—"}</td>
                                <td className="px-5 py-4 text-on-surface-variant">{c.project?.name ?? `Project #${c.project_id}`}</td>
                                <td className="px-5 py-4 text-right font-mono text-on-surface whitespace-nowrap">{formatRupiah(c.amount)}</td>
                                <td className="px-5 py-4 text-on-surface-variant whitespace-nowrap">{formatDate(c.created_at)}</td>
                                <td className="px-5 py-4">
                                    {canApprove ? (
                                        <div className="flex justify-center gap-1">
                                            <button onClick={() => setConfirm({ claim: c, action: "approve" })} title="Setujui"
                                                className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors"><Icon name="check_circle" className="text-[18px]" /></button>
                                            <button onClick={() => setConfirm({ claim: c, action: "reject" })} title="Tolak"
                                                className="p-2 rounded-lg text-error hover:bg-error-container/30 transition-colors"><Icon name="cancel" className="text-[18px]" /></button>
                                        </div>
                                    ) : (
                                        <p className="text-center text-xs text-tertiary-container">Menunggu admin</p>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <ConfirmDialog
                open={!!confirm}
                title={confirm?.action === "approve" ? "Setujui Klaim" : "Tolak Klaim"}
                message={
                    confirm?.action === "approve"
                        ? `Setujui & salurkan ${formatRupiah(confirm?.claim.amount ?? 0)} ke ${confirm?.claim.project?.name ?? "project"}? Notifikasi WhatsApp akan dikirim ke wakif.`
                        : `Tolak klaim ${formatRupiah(confirm?.claim.amount ?? 0)} ini?`
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