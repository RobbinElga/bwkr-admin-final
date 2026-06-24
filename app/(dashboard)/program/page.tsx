"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Program, ProgramStatus } from "@/types";
import { useAdminAuth } from "@/stores/auth";
import { friendlyError } from "@/lib/errors";
import { Icon } from "@/components/ui/Icon";
import { ProgramCard } from "@/components/program/ProgramCard";
import { ProgramListSkeleton } from "@/components/program/ProgramListSkeleton";
import { getPrograms, deleteProgram } from "@/services/program";
import { ProgramFormModal } from "@/components/program/ProgramFormModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type ViewState = "loading" | "ready" | "error";

export default function ProgramListPage() {
    const router = useRouter();
    const logout = useAdminAuth((s) => s.logout);

    const [state, setState] = useState<ViewState>("loading");
    const [programs, setPrograms] = useState<Program[]>([]);
    const [meta, setMeta] = useState<{ current_page: number; last_page: number } | null>(null);
    const [errMsg, setErrMsg] = useState("");

    // filter
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<ProgramStatus | "">("");
    const [page, setPage] = useState(1);
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Program | null>(null);
    const [deleting, setDeleting] = useState<Program | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const isSuper = useAdminAuth((s) => s.user?.role) === "super_admin";

    async function confirmDelete() {
        if (!deleting) return;
        setDeleteLoading(true);
        try {
            await deleteProgram(deleting.slug);
            setDeleting(null);
            load();
        } catch (err) {
            const code = err instanceof Error ? err.message : "SERVER";
            if (code === "UNAUTHORIZED") { await logout(); router.replace("/login"); return; }
            alert(friendlyError(code)); // sementara; bisa diganti toast nanti
        } finally {
            setDeleteLoading(false);
        }
    }

    async function load() {
        setState("loading");
        try {
            const res = await getPrograms({ search, status: statusFilter, page });
            setPrograms(res.data);
            setMeta({ current_page: res.meta.current_page, last_page: res.meta.last_page });
            setState("ready");
        } catch (err) {
            const code = err instanceof Error ? err.message : "SERVER";
            if (code === "UNAUTHORIZED") {
                await logout();
                router.replace("/login");
                return;
            }
            setErrMsg(friendlyError(code));
            setState("error");
        }
    }

    // muat ulang saat page / status berubah
    useEffect(() => { load(); }, [page, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

    // debounce untuk search (tunggu 400ms setelah user berhenti mengetik)
    useEffect(() => {
        const t = setTimeout(() => {
            setPage(1);
            load();
        }, 400);
        return () => clearTimeout(t);
    }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-on-surface">Manajemen Program</h2>
                    <p className="text-sm text-on-surface-variant mt-1">Kelola portofolio program wakaf dan proyek terkait.</p>
                </div>
                <button
                    onClick={() => { setEditing(null); setFormOpen(true); }}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container transition-colors whitespace-nowrap self-start sm:self-auto"
                >
                    <Icon name="add" className="text-[18px]" /> Tambah Program Baru
                </button>
            </div>

            {/* Filter bar */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 mb-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-xs">
                    <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari program..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value as ProgramStatus | ""); setPage(1); }}
                    className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none"
                >
                    <option value="">Semua Status</option>
                    <option value="aktif">Aktif</option>
                    <option value="nonaktif">Nonaktif</option>
                </select>
            </div>

            {/* Konten */}
            {state === "loading" ? (
                <ProgramListSkeleton />
            ) : state === "error" ? (
                <div className="flex flex-col items-center justify-center text-center py-20">
                    <div className="w-14 h-14 rounded-full bg-error-container flex items-center justify-center text-on-error-container mb-4">
                        <Icon name="cloud_off" className="text-[28px]" />
                    </div>
                    <h3 className="text-lg font-semibold text-on-surface">Gagal Memuat Program</h3>
                    <p className="text-sm text-on-surface-variant mt-1 max-w-sm">{errMsg}</p>
                    <button onClick={load} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container transition-colors">
                        <Icon name="refresh" className="text-[18px]" /> Coba Lagi
                    </button>
                </div>
            ) : programs.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-20">
                    <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant mb-4">
                        <Icon name="folder_off" className="text-[28px]" />
                    </div>
                    <h3 className="text-lg font-semibold text-on-surface">Belum Ada Program</h3>
                    <p className="text-sm text-on-surface-variant mt-1">
                        {search || statusFilter ? "Tidak ada program yang cocok dengan filter." : "Tambahkan program pertama Anda."}
                    </p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {programs.map((p) => (
                            <ProgramCard
                                key={p.id}
                                program={p}
                                onOpen={() => router.push(`/program/${p.slug}`)}
                                onEdit={() => { setEditing(p); setFormOpen(true); }}
                                onDelete={isSuper ? () => setDeleting(p) : undefined}
                            />
                        ))}
                    </div>

                    {/* Pagination */}
                    {meta && meta.last_page > 1 && (
                        <div className="flex items-center justify-center gap-3 mt-8">
                            <button
                                disabled={meta.current_page <= 1}
                                onClick={() => setPage((p) => p - 1)}
                                className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-4 py-2 text-sm text-on-surface hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <Icon name="chevron_left" className="text-[18px]" /> Sebelumnya
                            </button>
                            <span className="text-sm text-on-surface-variant">
                                Halaman {meta.current_page} dari {meta.last_page}
                            </span>
                            <button
                                disabled={meta.current_page >= meta.last_page}
                                onClick={() => setPage((p) => p + 1)}
                                className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-4 py-2 text-sm text-on-surface hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                Berikutnya <Icon name="chevron_right" className="text-[18px]" />
                            </button>
                        </div>
                    )}
                </>
            )}
            <ProgramFormModal
                open={formOpen}
                program={editing}
                onClose={() => setFormOpen(false)}
                onSaved={() => { setFormOpen(false); load(); }}
            />

            <ConfirmDialog
                open={!!deleting}
                title="Hapus Program"
                message={`Yakin ingin menghapus program "${deleting?.name}"? Program akan diarsipkan (soft delete) dan bisa dipulihkan admin.`}
                confirmLabel="Hapus"
                loading={deleteLoading}
                onConfirm={confirmDelete}
                onClose={() => setDeleting(null)}
            />
        </div>
    );
}