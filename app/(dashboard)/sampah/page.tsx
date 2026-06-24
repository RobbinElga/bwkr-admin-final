"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/stores/auth";
import { friendlyError } from "@/lib/errors";
import { Icon } from "@/components/ui/Icon";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { getTrashedPrograms, restoreProgram, forceDeleteProgram } from "@/services/program";
import { getTrashedProjects, restoreProject, forceDeleteProject } from "@/services/project";
import type { Program, Project, DonationInput, Claim, Expense } from "@/types";
import { getTrashedDonations, restoreDonation, forceDeleteDonation } from "@/services/donation";
import { getTrashedClaims, restoreClaim, forceDeleteClaim } from "@/services/claim";
import { getTrashedExpenses, restoreExpense, forceDeleteExpense } from "@/services/expense";
import { formatRupiah } from "@/lib/format";

type ViewState = "loading" | "ready" | "error";
type Kind = "program" | "project" | "donation" | "claim" | "expense";
type Purge = { kind: Kind; id: number; name: string } | null;

export default function SampahPage() {
    const router = useRouter();
    const logout = useAdminAuth((s) => s.logout);

    const [state, setState] = useState<ViewState>("loading");
    const [programs, setPrograms] = useState<Program[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [errMsg, setErrMsg] = useState("");
    const [busyId, setBusyId] = useState<string | null>(null);
    const [purge, setPurge] = useState<Purge>(null);
    const [purgeLoading, setPurgeLoading] = useState(false);
    const [donations, setDonations] = useState<DonationInput[]>([]);
    const [claims, setClaims] = useState<Claim[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);

    function handleAuthErr(err: unknown): string {
        const code = err instanceof Error ? err.message : "SERVER";
        if (code === "UNAUTHORIZED") { logout(); router.replace("/login"); }
        return friendlyError(code);
    }

    async function load() {
        setState("loading");
        try {
            const [pg, pj, dn, cl, ex] = await Promise.all([
                getTrashedPrograms(), getTrashedProjects(),
                getTrashedDonations(), getTrashedClaims(), getTrashedExpenses(),
            ]);
            setPrograms(pg); setProjects(pj);
            setDonations(dn); setClaims(cl); setExpenses(ex);
            setState("ready");
        } catch (err) { setErrMsg(handleAuthErr(err)); setState("error"); }
    }
    useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    async function doRestore(kind: Kind, id: number) {
        setBusyId(`${kind}-${id}`);
        try {
            if (kind === "program") { await restoreProgram(id); setPrograms((p) => p.filter((x) => x.id !== id)); }
            else if (kind === "project") { await restoreProject(id); setProjects((p) => p.filter((x) => x.id !== id)); }
            else if (kind === "donation") { await restoreDonation(id); setDonations((p) => p.filter((x) => x.id !== id)); }
            else if (kind === "claim") { await restoreClaim(id); setClaims((p) => p.filter((x) => x.id !== id)); }
            else { await restoreExpense(id); setExpenses((p) => p.filter((x) => x.id !== id)); }
        } catch (err) { alert(handleAuthErr(err)); }
        finally { setBusyId(null); }
    }

    async function confirmPurge() {
        if (!purge) return;
        setPurgeLoading(true);
        try {
            if (purge.kind === "program") { await forceDeleteProgram(purge.id); setPrograms((p) => p.filter((x) => x.id !== purge.id)); }
            else if (purge.kind === "project") { await forceDeleteProject(purge.id); setProjects((p) => p.filter((x) => x.id !== purge.id)); }
            else if (purge.kind === "donation") { await forceDeleteDonation(purge.id); setDonations((p) => p.filter((x) => x.id !== purge.id)); }
            else if (purge.kind === "claim") { await forceDeleteClaim(purge.id); setClaims((p) => p.filter((x) => x.id !== purge.id)); }
            else { await forceDeleteExpense(purge.id); setExpenses((p) => p.filter((x) => x.id !== purge.id)); }
            setPurge(null);
        } catch (err) { alert(handleAuthErr(err)); }
        finally { setPurgeLoading(false); }
    }

    const empty = programs.length === 0 && projects.length === 0 && donations.length === 0 && claims.length === 0 && expenses.length === 0;

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-on-surface">Sampah</h2>
                <p className="text-sm text-on-surface-variant mt-1">Program & proyek yang dihapus. Pulihkan atau hapus permanen.</p>
            </div>

            {state === "loading" ? (
                <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-surface-container-low animate-pulse" />)}</div>
            ) : state === "error" ? (
                <div className="flex flex-col items-center justify-center text-center py-20">
                    <div className="w-14 h-14 rounded-full bg-error-container flex items-center justify-center text-on-error-container mb-4"><Icon name="cloud_off" className="text-[28px]" /></div>
                    <h3 className="text-lg font-semibold text-on-surface">Gagal Memuat</h3>
                    <p className="text-sm text-on-surface-variant mt-1">{errMsg}</p>
                    <button onClick={load} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container transition-colors"><Icon name="refresh" className="text-[18px]" /> Coba Lagi</button>
                </div>
            ) : empty ? (
                <div className="flex flex-col items-center justify-center text-center py-20 border border-dashed border-outline-variant rounded-xl">
                    <Icon name="delete" className="text-[40px] text-outline-variant mb-3" />
                    <h3 className="text-base font-semibold text-on-surface">Sampah Kosong</h3>
                    <p className="text-sm text-on-surface-variant mt-1">Tidak ada item yang dihapus.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    <TrashSection title="Program" icon="account_tree" kind="program" busyId={busyId} onRestore={doRestore}
                        rows={programs.map((p) => ({ id: p.id, name: p.name, sub: p.deleted_at ?? null }))}
                        onPurge={(id, name) => setPurge({ kind: "program", id, name })} />
                    <TrashSection title="Proyek" icon="folder_open" kind="project" busyId={busyId} onRestore={doRestore}
                        rows={projects.map((p) => ({ id: p.id, name: p.name, sub: p.deleted_at ?? null }))}
                        onPurge={(id, name) => setPurge({ kind: "project", id, name })} />
                    <TrashSection title="Donasi" icon="volunteer_activism" kind="donation" busyId={busyId} onRestore={doRestore}
                        rows={donations.map((d) => ({ id: d.id, name: `${d.donor_name} — ${formatRupiah(d.amount)}`, sub: d.deleted_at ?? null }))}
                        onPurge={(id, name) => setPurge({ kind: "donation", id, name })} />
                    <TrashSection title="Klaim" icon="task" kind="claim" busyId={busyId} onRestore={doRestore}
                        rows={claims.map((c) => ({ id: c.id, name: `${c.project?.name ?? "Project"} — ${formatRupiah(c.amount)}`, sub: c.deleted_at ?? null }))}
                        onPurge={(id, name) => setPurge({ kind: "claim", id, name })} />
                    <TrashSection title="Pengeluaran" icon="receipt_long" kind="expense" busyId={busyId} onRestore={doRestore}
                        rows={expenses.map((e) => ({ id: e.id, name: `${e.project?.name ?? "Project"} — ${formatRupiah(e.amount)}`, sub: e.deleted_at ?? null }))}
                        onPurge={(id, name) => setPurge({ kind: "expense", id, name })} />
                </div>
            )}

            <ConfirmDialog open={!!purge} title="Hapus Permanen"
                message={`Hapus permanen "${purge?.name}"? Tindakan ini TIDAK bisa dibatalkan.`}
                confirmLabel="Hapus Permanen" danger loading={purgeLoading}
                onConfirm={confirmPurge} onClose={() => setPurge(null)} />
        </div>
    );
}

function TrashSection({ title, icon, rows, kind, busyId, onRestore, onPurge }: {
    title: string; icon: string;
    rows: { id: number; name: string; sub: string | null }[];
    kind: Kind;
    busyId: string | null;
    onRestore: (kind: Kind, id: number) => void;
    onPurge: (id: number, name: string) => void;
}) {
    if (rows.length === 0) return null;
    return (
        <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-on-surface-variant mb-3 flex items-center gap-2">
                <Icon name={icon} className="text-[18px]" /> {title} ({rows.length})
            </h3>
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl divide-y divide-outline-variant/60 overflow-hidden">
                {rows.map((r) => {
                    const busy = busyId === `${kind}-${r.id}`;
                    return (
                        <div key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-on-surface truncate">{r.name}</p>
                                {r.sub && <p className="text-xs text-on-surface-variant">Dihapus: {new Date(r.sub).toLocaleString("id-ID")}</p>}
                            </div>
                            <div className="flex gap-2 shrink-0">
                                <button onClick={() => onRestore(kind, r.id)} disabled={busy}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-1.5 text-sm text-on-surface hover:bg-surface-container disabled:opacity-50 transition-colors">
                                    <Icon name={busy ? "progress_activity" : "restore"} className={`text-[18px] ${busy ? "animate-spin" : ""}`} /> Pulihkan
                                </button>
                                <button onClick={() => onPurge(r.id, r.name)} disabled={busy}
                                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-error hover:bg-error-container/30 disabled:opacity-50 transition-colors">
                                    <Icon name="delete_forever" className="text-[18px]" /> Hapus
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}