"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { Program, Project } from "@/types";
import { getProgram } from "@/services/program";
import { useAdminAuth } from "@/stores/auth";
import { friendlyError } from "@/lib/errors";
import { formatRupiah } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { ProjectCard } from "@/components/project/ProjectCard";
import { ProgramListSkeleton } from "@/components/program/ProgramListSkeleton";
import { getProjects, deleteProject } from "@/services/project";
import { ProjectFormModal } from "@/components/project/ProjectFormModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type ViewState = "loading" | "ready" | "error";

export default function ProjectListPage() {
    const router = useRouter();
    const params = useParams();
    const slug = params.slug as string;
    const logout = useAdminAuth((s) => s.logout);

    const [state, setState] = useState<ViewState>("loading");
    const [program, setProgram] = useState<Program | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [errMsg, setErrMsg] = useState("");
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Project | null>(null);
    const [deleting, setDeleting] = useState<Project | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    async function confirmDelete() {
        if (!deleting) return;
        setDeleteLoading(true);
        try {
            await deleteProject(deleting.slug);
            setDeleting(null);
            load();
        } catch (err) {
            const code = err instanceof Error ? err.message : "SERVER";
            if (code === "UNAUTHORIZED") { await logout(); router.replace("/login"); return; }
            alert(friendlyError(code));
        } finally {
            setDeleteLoading(false);
        }
    }

    async function load() {
        setState("loading");
        try {
            const prog = await getProgram(slug);          // ambil program dulu
            setProgram(prog);
            const res = await getProjects({ program_id: prog.id });
            setProjects(res.data);
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
            <div>
                <div className="h-4 w-48 bg-surface-container rounded mb-3 animate-pulse" />
                <div className="h-7 w-56 bg-surface-container rounded mb-6 animate-pulse" />
                <ProgramListSkeleton />
            </div>
        );
    }

    if (state === "error") {
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

    const total = projects.length;
    const running = projects.filter((p) => p.status === "berjalan").length;
    const done = projects.filter((p) => p.status === "selesai").length;
    const totalRaised = projects.reduce((sum, p) => sum + p.amount_raised, 0);

    return (
        <div>
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-on-surface-variant mb-2">
                <Link href="/program" className="hover:text-primary transition-colors">Program</Link>
                <Icon name="chevron_right" className="text-[16px]" />
                <span className="text-on-surface font-medium">{program?.name}</span>
            </nav>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-on-surface">Daftar Project</h2>
                    <p className="text-sm text-on-surface-variant mt-1">Kelola project di bawah program {program?.name}.</p>
                </div>
                <button
                    onClick={() => { setEditing(null); setFormOpen(true); }}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container transition-colors whitespace-nowrap self-start sm:self-auto"
                >
                    <Icon name="add" className="text-[18px]" /> Tambah Project Baru
                </button>
            </div>

            {/* Stats ringkas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <MiniSummary icon="account_tree" label="Total Project" value={String(total)} />
                <MiniSummary icon="payments" label="Total Dana Terkumpul" value={formatRupiah(totalRaised)} />
                <MiniSummary icon="task_alt" label="Project Selesai" value={String(done)} />
            </div>

            {/* Daftar */}
            {projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-16 border border-dashed border-outline-variant rounded-xl">
                    <Icon name="folder_off" className="text-[40px] text-outline-variant mb-3" />
                    <h3 className="text-base font-semibold text-on-surface">Belum Ada Project</h3>
                    <p className="text-sm text-on-surface-variant mt-1">Tambahkan project pertama untuk program ini.</p>
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-2 mb-4">
                        <h3 className="text-base font-semibold text-on-surface">Project Berjalan & Lainnya</h3>
                        <span className="text-xs text-on-surface-variant">({running} berjalan)</span>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {projects.map((p) => (
                            <ProjectCard
                                key={p.id}
                                project={p}
                                onOpen={() => router.push(`/project/${p.slug}`)}
                                onEdit={() => { setEditing(p); setFormOpen(true); }}
                                onDelete={() => setDeleting(p)}
                            />
                        ))}
                    </div>
                </>
            )}
            {program && (
                <ProjectFormModal
                    open={formOpen}
                    project={editing}
                    programId={program.id}
                    programName={program.name}
                    onClose={() => setFormOpen(false)}
                    onSaved={() => { setFormOpen(false); load(); }}
                />
            )}

            <ConfirmDialog
                open={!!deleting}
                title="Hapus Project"
                message={`Yakin ingin menghapus project "${deleting?.name}"? Akan diarsipkan (soft delete) dan bisa dipulihkan admin.`}
                confirmLabel="Hapus"
                loading={deleteLoading}
                onConfirm={confirmDelete}
                onClose={() => setDeleting(null)}
            />
        </div>
    );
}

function MiniSummary({ icon, label, value }: { icon: string; label: string; value: string }) {
    return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
                <Icon name={icon} className="text-[22px]" />
            </div>
            <p className="text-xs text-on-surface-variant">{label}</p>
            <p className="text-xl font-bold text-on-surface mt-0.5">{value}</p>
        </div>
    );
}