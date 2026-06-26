"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { DonationInput, Project } from "@/types";
import { getDonationInputs } from "@/services/donation";
import { getClaimProjects } from "@/services/claim";
import { useAdminAuth } from "@/stores/auth";
import { friendlyError } from "@/lib/errors";
import { formatRupiah, formatDate } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { ClaimFormModal } from "@/components/claim/ClaimFormModal";
import { PendingClaims } from "@/components/claim/PendingClaims";
import { ExportButton } from "@/components/ui/ExportButton";
import { DonationDetailModal } from "@/components/donation/DonationDetailModal";

type ViewState = "loading" | "ready" | "error";

export default function ClaimDonasiPage() {
    const router = useRouter();
    const logout = useAdminAuth((s) => s.logout);

    const [state, setState] = useState<ViewState>("loading");
    const [rows, setRows] = useState<DonationInput[]>([]);
    const [meta, setMeta] = useState<{ current_page: number; last_page: number; total: number } | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [errMsg, setErrMsg] = useState("");
    const [page, setPage] = useState(1);
    const [active, setActive] = useState<DonationInput | null>(null);
    const [tab, setTab] = useState<"siap" | "pending">("siap");
    const [detail, setDetail] = useState<DonationInput | null>(null);

    async function load() {
        setState("loading");
        try {
            const [res, projs] = await Promise.all([
                getDonationInputs({ status: "pending", page }),
                projects.length ? Promise.resolve(projects) : getClaimProjects().catch(() => []),
            ]);
            setRows(res.data);
            setMeta({ current_page: res.meta.current_page, last_page: res.meta.last_page, total: res.meta.total });
            if (!projects.length) setProjects(projs);
            setState("ready");
        } catch (err) {
            const code = err instanceof Error ? err.message : "SERVER";
            if (code === "UNAUTHORIZED") { await logout(); router.replace("/login"); return; }
            setErrMsg(friendlyError(code));
            setState("error");
        }
    }
    useEffect(() => { load(); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

    const projectName = (id: number | null) => (id ? projects.find((p) => p.id === id)?.name ?? `Project #${id}` : null);

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-on-surface">Claim Donasi</h2>
                    <p className="text-sm text-on-surface-variant mt-1">Alokasikan donasi yang sudah masuk ke project tujuan, lalu setujui.</p>
                </div>
                <ExportButton path="donations-claim/export" name="laporan-klaim" />
            </div>
            <div className="flex gap-1 mb-6 border-b border-outline-variant">
                {([["siap", "Siap Diklaim"], ["pending", "Menunggu Persetujuan"]] as const).map(([key, label]) => (
                    <button key={key} onClick={() => setTab(key)}
                        className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${tab === key ? "text-primary border-primary" : "text-on-surface-variant border-transparent hover:text-primary"
                            }`}>
                        {label}
                    </button>
                ))}
            </div>

            {tab === "pending" ? (
                <PendingClaims onChanged={() => { /* refresh daftar siap diklaim saat balik tab */ load(); }} />
            ) : (
                <>

                    {/* Metric */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 max-w-md">
                        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
                            <div className="w-10 h-10 rounded-lg bg-tertiary-container/15 text-tertiary-container flex items-center justify-center mb-3">
                                <Icon name="receipt_long" className="text-[22px]" />
                            </div>
                            <p className="text-xs uppercase tracking-wide text-on-surface-variant">Donasi Siap Diklaim</p>
                            <p className="text-2xl font-bold text-on-surface mt-0.5">{meta?.total ?? "—"}</p>
                        </div>
                    </div>

                    {state === "loading" ? (
                        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 animate-pulse">
                            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-surface-container rounded mb-2" />)}
                        </div>
                    ) : state === "error" ? (
                        <div className="flex flex-col items-center justify-center text-center py-20">
                            <div className="w-14 h-14 rounded-full bg-error-container flex items-center justify-center text-on-error-container mb-4">
                                <Icon name="cloud_off" className="text-[28px]" />
                            </div>
                            <h3 className="text-lg font-semibold text-on-surface">Gagal Memuat Data</h3>
                            <p className="text-sm text-on-surface-variant mt-1">{errMsg}</p>
                            <button onClick={load} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container transition-colors">
                                <Icon name="refresh" className="text-[18px]" /> Coba Lagi
                            </button>
                        </div>
                    ) : rows.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center py-20 border border-dashed border-outline-variant rounded-xl">
                            <Icon name="task_alt" className="text-[40px] text-outline-variant mb-3" />
                            <h3 className="text-base font-semibold text-on-surface">Semua Donasi Sudah Diklaim</h3>
                            <p className="text-sm text-on-surface-variant mt-1">Tidak ada donasi pending yang menunggu alokasi.</p>
                        </div>
                    ) : (
                        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.04)] overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm min-w-[760px]">
                                    <thead>
                                        <tr className="border-b border-outline-variant bg-surface-container-low/50 text-xs uppercase tracking-wide text-on-surface-variant">
                                            <th className="px-5 py-3 font-semibold">Ref</th>
                                            <th className="px-5 py-3 font-semibold">Wakif</th>
                                            <th className="px-5 py-3 font-semibold">Tujuan Donatur</th>
                                            <th className="px-5 py-3 font-semibold text-right">Nominal</th>
                                            <th className="px-5 py-3 font-semibold">Tanggal</th>
                                            <th className="px-5 py-3 font-semibold text-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-outline-variant/60">
                                        {rows.map((d) => (
                                            <tr key={d.id} onClick={() => setDetail(d)}
                                                className="hover:bg-surface-container-low transition-colors cursor-pointer">
                                                <td className="px-5 py-3 font-mono text-primary whitespace-nowrap">{d.ref_no}</td>
                                                <td className="px-5 py-3 font-medium text-on-surface">{d.donor_name}</td>
                                                <td className="px-5 py-3 text-on-surface-variant">{projectName(d.project_id) ?? <span className="italic opacity-70">Wakaf Umum</span>}</td>
                                                <td className="px-5 py-3 text-right font-mono text-on-surface whitespace-nowrap">{formatRupiah(d.amount)}</td>
                                                <td className="px-5 py-3 text-on-surface-variant whitespace-nowrap">{formatDate(d.created_at)}</td>
                                                <td className="px-5 py-3 text-center">
                                                    <button onClick={(e) => { e.stopPropagation(); setActive(d); }}
                                                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-on-primary hover:bg-primary-container transition-colors">
                                                        <Icon name="task" className="text-[18px]" /> Klaim
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
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
            <ClaimFormModal
                open={!!active}
                donation={active}
                projects={projects}
                onClose={() => setActive(null)}
                onDone={() => { setActive(null); load(); }}
            />
        </div>
    );
}