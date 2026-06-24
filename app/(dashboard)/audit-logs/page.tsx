"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuditLog } from "@/types";
import { getAuditLogs } from "@/services/user";
import { useAdminAuth } from "@/stores/auth";
import { friendlyError } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";

type ViewState = "loading" | "ready" | "error";

// peta aksi → label & gaya
const ACTION_META: Record<string, { label: string; icon: string; cls: string }> = {
    created: { label: "Dibuat", icon: "add_circle", cls: "bg-primary/10 text-primary" },
    updated: { label: "Diperbarui", icon: "edit", cls: "bg-secondary-container text-on-secondary-container" },
    deleted: { label: "Dihapus", icon: "delete", cls: "bg-error/10 text-error" },
    approved: { label: "Disetujui", icon: "check_circle", cls: "bg-primary/10 text-primary" },
    rejected: { label: "Ditolak", icon: "cancel", cls: "bg-error/10 text-error" },
    broadcast: { label: "Broadcast", icon: "campaign", cls: "bg-tertiary-container/15 text-tertiary" },
    password_reset: { label: "Reset Password", icon: "lock_reset", cls: "bg-tertiary-container/15 text-tertiary" },
    "2fa_reset": { label: "Reset 2FA", icon: "shield_lock", cls: "bg-tertiary-container/15 text-tertiary" },
};

// ambil nama entitas pendek dari model_type (App\Models\Project -> Project)
function shortModel(t: string | null) {
    if (!t) return "—";
    return t.split("\\").pop() ?? t;
}

const ACTION_OPTIONS = ["created", "updated", "deleted", "approved", "rejected", "broadcast", "password_reset", "2fa_reset"];

export default function AuditLogsPage() {
    const router = useRouter();
    const logout = useAdminAuth((s) => s.logout);

    const [state, setState] = useState<ViewState>("loading");
    const [rows, setRows] = useState<AuditLog[]>([]);
    const [meta, setMeta] = useState<{ current_page: number; last_page: number; total: number } | null>(null);
    const [errMsg, setErrMsg] = useState("");
    const [action, setAction] = useState("");
    const [page, setPage] = useState(1);

    async function load() {
        setState("loading");
        try {
            const res = await getAuditLogs({ action: action || undefined, page });
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
    useEffect(() => { load(); }, [page, action]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-on-surface">Audit Log</h2>
                    <p className="text-sm text-on-surface-variant mt-1">Riwayat semua aksi penting yang dilakukan staf.</p>
                </div>
            </div>

            {/* Filter */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 mb-4 flex gap-3">
                <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}
                    className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none">
                    <option value="">Semua Aksi</option>
                    {ACTION_OPTIONS.map((a) => <option key={a} value={a}>{ACTION_META[a]?.label ?? a}</option>)}
                </select>
            </div>

            {state === "loading" ? (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 animate-pulse">
                    {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 bg-surface-container rounded mb-2" />)}
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
                    <Icon name="history" className="text-[40px] text-outline-variant mb-3" />
                    <h3 className="text-base font-semibold text-on-surface">Belum Ada Log</h3>
                    <p className="text-sm text-on-surface-variant mt-1">{action ? "Tidak ada log untuk aksi ini." : "Aktivitas staf akan tercatat di sini."}</p>
                </div>
            ) : (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm min-w-[760px]">
                            <thead>
                                <tr className="bg-surface-container-low/50 border-b border-outline-variant text-xs uppercase tracking-wide text-on-surface-variant">
                                    <th className="px-5 py-3 font-semibold">Waktu</th>
                                    <th className="px-5 py-3 font-semibold">Staf</th>
                                    <th className="px-5 py-3 font-semibold text-center">Aksi</th>
                                    <th className="px-5 py-3 font-semibold">Entitas</th>
                                    <th className="px-5 py-3 font-semibold">IP</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant/60">
                                {rows.map((log) => {
                                    const m = ACTION_META[log.action] ?? { label: log.action, icon: "bolt", cls: "bg-surface-variant text-on-surface-variant" };
                                    return (
                                        <tr key={log.id} className="hover:bg-surface-container-low transition-colors">
                                            <td className="px-5 py-4 text-on-surface-variant whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                                            <td className="px-5 py-4 font-medium text-on-surface">{log.user_name ?? "Sistem"}</td>
                                            <td className="px-5 py-4 text-center">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${m.cls}`}>
                                                    <Icon name={m.icon} className="text-[14px]" /> {m.label}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-on-surface-variant">
                                                {shortModel(log.model_type)}{log.model_id ? <span className="text-on-surface-variant/70"> #{log.model_id}</span> : ""}
                                            </td>
                                            <td className="px-5 py-4 text-on-surface-variant font-mono text-xs">{log.ip_address ?? "—"}</td>
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
        </div>
    );
}