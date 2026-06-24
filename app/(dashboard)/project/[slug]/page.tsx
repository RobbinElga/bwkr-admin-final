"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAdminAuth } from "@/stores/auth";
import { friendlyError } from "@/lib/errors";
import { formatRupiah, formatDate, formatDateTime } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { ProjectFormModal } from "@/components/project/ProjectFormModal";
import { ProjectUpdateFormModal } from "@/components/project/ProjectUpdateFormModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { getExpenses } from "@/services/expense";
import { getProject, getProjectStats, getProjectUpdates, deleteProjectUpdate, getProjectDonors } from "@/services/project";
import type { Project, ProjectStats, ProjectUpdate, Expense, ProjectDonor } from "@/types";

type ViewState = "loading" | "ready" | "error";
type Tab = "detail" | "update" | "donatur" | "dana";

const STATUS: Record<Project["status"], { label: string; cls: string }> = {
    berjalan: { label: "Berjalan", cls: "bg-primary-fixed/30 text-primary-container border border-primary-fixed" },
    selesai: { label: "Selesai", cls: "bg-secondary-container text-on-secondary-container border border-secondary-fixed-dim" },
    draft: { label: "Draft", cls: "bg-tertiary-fixed-dim/30 text-tertiary border border-tertiary-fixed-dim" },
};

export default function ProjectDetailPage() {
    const router = useRouter();
    const params = useParams();
    const slug = params.slug as string;
    const logout = useAdminAuth((s) => s.logout);

    const [state, setState] = useState<ViewState>("loading");
    const [project, setProject] = useState<Project | null>(null);
    const [stats, setStats] = useState<ProjectStats | null>(null);
    const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
    const [errMsg, setErrMsg] = useState("");
    const [tab, setTab] = useState<Tab>("detail");
    const [editOpen, setEditOpen] = useState(false);
    const [activeImg, setActiveImg] = useState(0);
    const [updateModalOpen, setUpdateModalOpen] = useState(false);
    const [editingUpdate, setEditingUpdate] = useState<ProjectUpdate | null>(null);
    const [deletingUpdate, setDeletingUpdate] = useState<ProjectUpdate | null>(null);
    const [delUpdateLoading, setDelUpdateLoading] = useState(false);
    const [expenses, setExpenses] = useState<Expense[] | null>(null);
    const [expensesLoading, setExpensesLoading] = useState(false);
    const [donors, setDonors] = useState<ProjectDonor[] | null>(null);
    const [donorsLoading, setDonorsLoading] = useState(false);

    useEffect(() => {
        if (tab === "donatur" && project && donors === null && !donorsLoading) {
            setDonorsLoading(true);
            getProjectDonors(slug)
                .then(setDonors)
                .catch(() => setDonors([]))
                .finally(() => setDonorsLoading(false));
        }
    }, [tab, project, donors, donorsLoading]);

    useEffect(() => {
        if (tab === "dana" && project && expenses === null && !expensesLoading) {
            setExpensesLoading(true);
            getExpenses({ project_id: project.id })
                .then(setExpenses)
                .catch(() => setExpenses([]))
                .finally(() => setExpensesLoading(false));
        }
    }, [tab, project, expenses, expensesLoading]);

    async function reloadUpdates() {
        try {
            setUpdates(await getProjectUpdates(slug));
        } catch { /* abaikan */ }
    }

    async function confirmDeleteUpdate() {
        if (!deletingUpdate) return;
        setDelUpdateLoading(true);
        try {
            await deleteProjectUpdate(slug, deletingUpdate.id);
            setDeletingUpdate(null);
            reloadUpdates();
        } catch (err) {
            const code = err instanceof Error ? err.message : "SERVER";
            if (code === "UNAUTHORIZED") { await logout(); router.replace("/login"); return; }
            alert(friendlyError(code));
        } finally {
            setDelUpdateLoading(false);
        }
    }


    async function load() {
        setState("loading");
        try {
            const p = await getProject(slug);
            setProject(p);
            setActiveImg(0);
            const [st, up] = await Promise.all([
                getProjectStats(slug).catch(() => null),
                getProjectUpdates(slug).catch(() => []),
            ]);
            setStats(st);
            setUpdates(up);
            setState("ready");
        } catch (err) {
            const code = err instanceof Error ? err.message : "SERVER";
            if (code === "UNAUTHORIZED") { await logout(); router.replace("/login"); return; }
            setErrMsg(friendlyError(code));
            setState("error");
        }
    }

    useEffect(() => { load(); }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

    if (state === "loading") {
        return (
            <div className="animate-pulse">
                <div className="h-4 w-48 bg-surface-container rounded mb-3" />
                <div className="h-8 w-2/3 bg-surface-container rounded mb-6" />
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    <div className="lg:col-span-8 h-96 bg-surface-container rounded-xl" />
                    <div className="lg:col-span-4 h-96 bg-surface-container rounded-xl" />
                </div>
            </div>
        );
    }

    if (state === "error" || !project) {
        return (
            <div className="flex flex-col items-center justify-center text-center py-20">
                <div className="w-14 h-14 rounded-full bg-error-container flex items-center justify-center text-on-error-container mb-4">
                    <Icon name="cloud_off" className="text-[28px]" />
                </div>
                <h3 className="text-lg font-semibold text-on-surface">Gagal Memuat Project</h3>
                <p className="text-sm text-on-surface-variant mt-1 max-w-sm">{errMsg}</p>
                <button onClick={load} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container transition-colors">
                    <Icon name="refresh" className="text-[18px]" /> Coba Lagi
                </button>
            </div>
        );
    }

    const s = STATUS[project.status] ?? STATUS.draft;
    const pct = Math.min(project.progress_percent, 100);
    const programSlug = project.program?.slug;
    const growth = stats?.daily_growth_percent ?? 0;

    const TABS: { key: Tab; label: string }[] = [
        { key: "detail", label: "Detail Project" },
        { key: "update", label: "Update Project" },
        { key: "donatur", label: "Donatur Project" },
        { key: "dana", label: "Dana Terpakai" },
    ];

    return (
        <div>
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-on-surface-variant mb-2 flex-wrap">
                <Link href="/program" className="hover:text-primary transition-colors">Program</Link>
                {programSlug && (
                    <>
                        <Icon name="chevron_right" className="text-[16px]" />
                        <Link href={`/program/${programSlug}`} className="hover:text-primary transition-colors">{project.program?.name}</Link>
                    </>
                )}
                <Icon name="chevron_right" className="text-[16px]" />
                <span className="text-on-surface font-medium">Detail Project</span>
            </nav>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-on-surface">{project.name}</h2>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold ${s.cls}`}>{s.label}</span>
                        {project.end_date && (
                            <span className="text-sm text-on-surface-variant flex items-center gap-1">
                                <Icon name="calendar_today" className="text-[16px]" /> Berakhir {formatDate(project.end_date)}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex gap-3 self-start">
                    <button onClick={() => setEditOpen(true)}
                        className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container transition-colors">
                        <Icon name="edit" className="text-[18px]" /> Edit Project
                    </button>
                    <button
                        onClick={() => { setEditingUpdate(null); setUpdateModalOpen(true); setTab("update"); }}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container transition-colors">
                        <Icon name="add" className="text-[18px]" /> Tambah Update
                    </button>
                </div>
            </div>

            {/* Bento 2 kolom */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* KIRI */}
                <div className="lg:col-span-8 flex flex-col gap-5">
                    {/* Progress */}
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
                        <div className="flex justify-between items-end mb-4">
                            <div>
                                <p className="text-sm text-on-surface-variant mb-1">Dana Terkumpul</p>
                                <p className="text-2xl font-bold text-primary">{formatRupiah(project.amount_raised)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-on-surface-variant mb-1">Target</p>
                                <p className="text-lg font-semibold text-on-surface">{formatRupiah(project.target_amount)}</p>
                            </div>
                        </div>
                        <div className="h-3 bg-surface-container-high rounded-full overflow-hidden mb-2">
                            <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="font-semibold text-primary-container">{pct}% tercapai</span>
                            {stats && <span className="text-on-surface-variant">{stats.donor_count.toLocaleString("id-ID")} Donatur</span>}
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.04)] overflow-hidden">
                        <div className="flex border-b border-outline-variant overflow-x-auto bg-surface-container-low/50">
                            {TABS.map((t) => (
                                <button key={t.key} onClick={() => setTab(t.key)}
                                    className={`px-5 py-3.5 text-sm font-semibold whitespace-nowrap transition-colors ${tab === t.key ? "text-primary border-b-2 border-primary bg-surface-container-lowest" : "text-on-surface-variant hover:text-primary"
                                        }`}>
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        <div className="p-5">
                            {tab === "detail" && (
                                <div className="flex flex-col gap-6">
                                    {project.image_urls.length > 0 ? (
                                        <div>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={project.image_urls[activeImg]} alt={project.name} className="w-full h-64 object-cover rounded-lg border border-outline-variant" />
                                            {project.image_urls.length > 1 && (
                                                <div className="flex gap-2 mt-2 flex-wrap">
                                                    {project.image_urls.map((src, i) => (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img key={i} src={src} alt={`thumb ${i + 1}`} onClick={() => setActiveImg(i)}
                                                            className={`w-16 h-16 object-cover rounded-lg border cursor-pointer transition-all ${i === activeImg ? "border-primary ring-2 ring-primary/30" : "border-outline-variant opacity-70 hover:opacity-100"
                                                                }`} />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="h-48 rounded-lg border border-dashed border-outline-variant flex items-center justify-center text-on-surface-variant">
                                            <Icon name="image" className="text-[36px] opacity-40" />
                                        </div>
                                    )}
                                    <div>
                                        <h4 className="text-base font-semibold text-on-surface mb-2">Deskripsi</h4>
                                        <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-line">{project.description || "Belum ada deskripsi."}</p>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-surface rounded-lg border border-outline-variant/50">
                                        <InfoItem icon="account_tree" label="Program" value={project.program?.name ?? "—"} />
                                        <InfoItem icon="event" label="Periode" value={`${project.start_date ? formatDate(project.start_date) : "—"} s/d ${project.end_date ? formatDate(project.end_date) : "—"}`} />
                                        <InfoItem icon="flag" label="Target Dana" value={formatRupiah(project.target_amount)} />
                                        <InfoItem icon="info" label="Status" value={s.label} />
                                    </div>
                                </div>
                            )}

                            {tab === "update" && (
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="text-base font-semibold text-on-surface">Daftar Update ({updates.length})</h4>
                                        <button onClick={() => { setEditingUpdate(null); setUpdateModalOpen(true); }}
                                            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-on-primary hover:bg-primary-container transition-colors">
                                            <Icon name="add" className="text-[18px]" /> Tambah Update
                                        </button>
                                    </div>

                                    {updates.length === 0 ? (
                                        <div className="py-12 text-center text-on-surface-variant">
                                            <Icon name="post_add" className="text-[40px] opacity-40 mb-2" />
                                            <p className="text-sm">Belum ada update untuk project ini.</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-3">
                                            {updates.map((u) => (
                                                <div key={u.id} className="border border-outline-variant rounded-lg p-4 flex gap-4">
                                                    {u.image_urls[0] && (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={u.image_urls[0]} alt={u.title} className="w-20 h-20 rounded-lg object-cover border border-outline-variant shrink-0" />
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <h5 className="font-semibold text-on-surface">{u.title}</h5>
                                                            <div className="flex gap-1 shrink-0">
                                                                <button onClick={() => { setEditingUpdate(u); setUpdateModalOpen(true); }}
                                                                    className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors">
                                                                    <Icon name="edit" className="text-[18px]" />
                                                                </button>
                                                                <button onClick={() => setDeletingUpdate(u)}
                                                                    className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors">
                                                                    <Icon name="delete" className="text-[18px]" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-on-surface-variant mb-1">{u.published_at ? formatDateTime(u.published_at) : "—"}</p>
                                                        <p className="text-sm text-on-surface-variant line-clamp-3">{u.content || "—"}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {tab === "dana" && (
                                <ExpensesTab loading={expensesLoading} expenses={expenses} />
                            )}

                            {tab === "donatur" && (
                                <DonorsTab loading={donorsLoading} donors={donors} />
                            )}
                        </div>
                    </div>
                </div>

                {/* KANAN */}
                <div className="lg:col-span-4 flex flex-col gap-5">
                    {/* Quick stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)] flex flex-col gap-2">
                            <div className="w-8 h-8 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center">
                                <Icon name="account_balance_wallet" className="text-[20px]" />
                            </div>
                            <span className="text-xs text-on-surface-variant">Rata-rata Donasi</span>
                            <span className="text-base font-bold text-on-surface font-mono">
                                {stats ? formatRupiah(stats.average_donation) : "—"}
                            </span>
                        </div>
                        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)] flex flex-col gap-2">
                            <div className="w-8 h-8 rounded-lg bg-tertiary-container/15 text-tertiary-container flex items-center justify-center">
                                <Icon name={growth >= 0 ? "trending_up" : "trending_down"} className="text-[20px]" />
                            </div>
                            <span className="text-xs text-on-surface-variant">Pertumbuhan Harian</span>
                            <span className={`text-base font-bold font-mono ${growth >= 0 ? "text-primary" : "text-error"}`}>
                                {stats ? `${growth >= 0 ? "+" : ""}${growth}%` : "—"}
                            </span>
                        </div>
                    </div>

                    {/* Update Terbaru */}
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-base font-semibold text-on-surface">Update Terbaru</h3>
                            {updates.length > 0 && (
                                <button onClick={() => setTab("update")} className="text-sm font-medium text-primary hover:underline">Lihat Semua</button>
                            )}
                        </div>

                        {updates.length === 0 ? (
                            <p className="text-sm text-on-surface-variant text-center py-6">Belum ada update.</p>
                        ) : (
                            <div className="relative pl-6 border-l-2 border-surface-container-highest space-y-6">
                                {updates.slice(0, 3).map((u, i) => (
                                    <div key={u.id} className="relative">
                                        <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-4 border-surface-container-lowest ${i === 0 ? "bg-primary" : "bg-surface-container-high"}`} />
                                        <div className="text-xs text-on-surface-variant mb-1">{u.published_at ? formatDateTime(u.published_at) : "—"}</div>
                                        <div className="text-sm font-medium text-on-surface mb-1">{u.title}</div>
                                        <div className="text-sm text-on-surface-variant line-clamp-2">{u.content}</div>
                                        {u.image_urls[0] && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={u.image_urls[0]} alt={u.title} className="w-full h-24 object-cover rounded border border-outline-variant mt-2" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Ringkasan Penggunaan */}
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
                        <div className="flex items-center gap-2 mb-4 border-b border-outline-variant pb-4">
                            <Icon name="payments" className="text-tertiary" />
                            <h3 className="text-base font-semibold text-on-surface">Ringkasan Penggunaan</h3>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-on-surface-variant">Total Terkumpul</span>
                                <span className="font-mono font-medium text-on-surface">{formatRupiah(project.amount_raised)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-error">
                                <span>Dana Terpakai</span>
                                <span className="font-mono font-medium">- {formatRupiah(project.amount_spent)}</span>
                            </div>
                            <div className="pt-3 border-t border-outline-variant flex justify-between items-center">
                                <span className="font-semibold text-on-surface">Saldo Proyek</span>
                                <span className="font-mono text-base font-bold text-primary">{formatRupiah(project.remaining_funds)}</span>
                            </div>
                        </div>
                        <button onClick={() => setTab("dana")}
                            className="w-full mt-5 py-2.5 border border-outline-variant rounded-lg text-sm font-medium text-on-surface hover:bg-surface-container transition-colors">
                            Lihat Rincian Pengeluaran
                        </button>
                    </div>
                </div>
            </div>

            <ProjectUpdateFormModal
                open={updateModalOpen}
                projectSlug={slug}
                update={editingUpdate}
                onClose={() => setUpdateModalOpen(false)}
                onSaved={() => { setUpdateModalOpen(false); reloadUpdates(); }}
            />

            <ConfirmDialog
                open={!!deletingUpdate}
                title="Hapus Update"
                message={`Yakin ingin menghapus update "${deletingUpdate?.title}"? Tindakan ini permanen.`}
                confirmLabel="Hapus"
                loading={delUpdateLoading}
                onConfirm={confirmDeleteUpdate}
                onClose={() => setDeletingUpdate(null)}
            />

            <ProjectFormModal
                open={editOpen}
                project={project}
                programId={project.program_id}
                programName={project.program?.name ?? ""}
                onClose={() => setEditOpen(false)}
                onSaved={() => { setEditOpen(false); load(); }}
            />
        </div>
    );
}

function InfoItem({ icon, label, value }: { icon: string; label: string; value: string }) {
    return (
        <div className="flex gap-3">
            <Icon name={icon} className="text-[20px] text-primary mt-0.5" />
            <div>
                <p className="text-xs text-on-surface-variant">{label}</p>
                <p className="text-sm font-medium text-on-surface">{value}</p>
            </div>
        </div>
    );
}

const EXP_STATUS: Record<Expense["status"], { label: string; cls: string }> = {
    pending: { label: "Menunggu", cls: "bg-tertiary-container/10 text-tertiary-container" },
    approved: { label: "Disetujui", cls: "bg-primary/10 text-primary" },
    rejected: { label: "Ditolak", cls: "bg-error/10 text-error" },
};

function ExpensesTab({ loading, expenses }: { loading: boolean; expenses: Expense[] | null }) {
    if (loading) {
        return (
            <div className="py-12 flex justify-center">
                <Icon name="progress_activity" className="text-[32px] text-primary animate-spin" />
            </div>
        );
    }

    const list = expenses ?? [];
    const approvedTotal = list.filter((e) => e.status === "approved").reduce((s, e) => s + e.amount, 0);
    const pendingTotal = list.filter((e) => e.status === "pending").reduce((s, e) => s + e.amount, 0);

    return (
        <div>
            {/* Ringkasan */}
            <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-surface-container-low rounded-lg p-3">
                    <p className="text-xs text-on-surface-variant">Total Disetujui (Terpakai)</p>
                    <p className="text-base font-bold text-on-surface font-mono">{formatRupiah(approvedTotal)}</p>
                </div>
                <div className="bg-surface-container-low rounded-lg p-3">
                    <p className="text-xs text-on-surface-variant">Menunggu Persetujuan</p>
                    <p className="text-base font-bold text-on-surface font-mono">{formatRupiah(pendingTotal)}</p>
                </div>
            </div>

            {list.length === 0 ? (
                <div className="py-12 text-center text-on-surface-variant">
                    <Icon name="receipt_long" className="text-[40px] opacity-40 mb-2" />
                    <p className="text-sm">Belum ada pengeluaran untuk project ini.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-outline-variant text-xs uppercase tracking-wide text-on-surface-variant">
                                <th className="py-3 pr-4 font-semibold">Tanggal</th>
                                <th className="py-3 pr-4 font-semibold text-right">Nominal</th>
                                <th className="py-3 pr-4 font-semibold">Rekening</th>
                                <th className="py-3 pr-4 font-semibold text-center">Status</th>
                                <th className="py-3 pr-4 font-semibold">Bukti</th>
                                <th className="py-3 font-semibold">Catatan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/60">
                            {list.map((e) => {
                                const st = EXP_STATUS[e.status] ?? EXP_STATUS.pending;
                                return (
                                    <tr key={e.id} className="hover:bg-surface-container-low transition-colors">
                                        <td className="py-3 pr-4 text-on-surface-variant whitespace-nowrap">{formatDate(e.created_at)}</td>
                                        <td className="py-3 pr-4 text-right font-mono text-on-surface whitespace-nowrap">{formatRupiah(e.amount)}</td>
                                        <td className="py-3 pr-4 text-on-surface-variant">{e.bank_account?.bank_name ?? "—"}</td>
                                        <td className="py-3 pr-4 text-center">
                                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>{st.label}</span>
                                        </td>
                                        <td className="py-3 pr-4">
                                            <div className="flex gap-1.5 text-on-surface-variant">
                                                {e.has_receipt && <Icon name="receipt" className="text-[18px]" />}
                                                {e.has_ttd && <Icon name="draw" className="text-[18px]" />}
                                                {e.needs_materai && (
                                                    <Icon name="verified" className={`text-[18px] ${e.has_materai ? "text-primary" : "text-error"}`} />
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3 text-on-surface-variant line-clamp-1 max-w-[200px]">{e.notes || "—"}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function DonorsTab({ loading, donors }: { loading: boolean; donors: ProjectDonor[] | null }) {
    if (loading) {
        return (
            <div className="py-12 flex justify-center">
                <Icon name="progress_activity" className="text-[32px] text-primary animate-spin" />
            </div>
        );
    }

    const list = donors ?? [];
    const total = list.reduce((s, d) => s + d.amount, 0);

    return (
        <div>
            {/* Ringkasan */}
            <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-surface-container-low rounded-lg p-3">
                    <p className="text-xs text-on-surface-variant">Jumlah Donatur</p>
                    <p className="text-base font-bold text-on-surface">{list.length.toLocaleString("id-ID")}</p>
                </div>
                <div className="bg-surface-container-low rounded-lg p-3">
                    <p className="text-xs text-on-surface-variant">Total Donasi Masuk</p>
                    <p className="text-base font-bold text-on-surface font-mono">{formatRupiah(total)}</p>
                </div>
            </div>

            {list.length === 0 ? (
                <div className="py-12 text-center text-on-surface-variant">
                    <Icon name="groups" className="text-[40px] opacity-40 mb-2" />
                    <p className="text-sm">Belum ada donatur untuk project ini.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-outline-variant text-xs uppercase tracking-wide text-on-surface-variant">
                                <th className="py-3 pr-4 font-semibold">Ref</th>
                                <th className="py-3 pr-4 font-semibold">Nama Donatur</th>
                                <th className="py-3 pr-4 font-semibold text-right">Nominal</th>
                                <th className="py-3 pr-4 font-semibold text-center">Status</th>
                                <th className="py-3 font-semibold text-right">Tanggal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/60">
                            {list.map((d) => (
                                <tr key={d.id} className="hover:bg-surface-container-low transition-colors">
                                    <td className="py-3 pr-4 font-mono text-primary">{d.ref_no ?? "—"}</td>
                                    <td className="py-3 pr-4 font-medium text-on-surface">{d.donor_name ?? "Hamba Allah"}</td>
                                    <td className="py-3 pr-4 text-right font-mono text-on-surface whitespace-nowrap">{formatRupiah(d.amount)}</td>
                                    <td className="py-3 pr-4 text-center">
                                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">Berhasil</span>
                                    </td>
                                    <td className="py-3 text-right text-on-surface-variant whitespace-nowrap">
                                        {d.approved_at ? formatDate(d.approved_at) : "—"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}