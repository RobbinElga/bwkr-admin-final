"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReportItem, ReportCategory } from "@/types";
import { getReportList, deleteReport } from "@/services/report";
import { useAdminAuth } from "@/stores/auth";
import { friendlyError } from "@/lib/errors";
import { Icon } from "@/components/ui/Icon";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ReportFormModal } from "@/components/report/ReportFormModal";

type ViewState = "loading" | "ready" | "error";

const CATEGORY_LABEL: Record<ReportCategory, string> = {
    tahunan: "Tahunan",
    keuangan: "Keuangan",
    program: "Program",
};

export default function LaporanPage() {
    const router = useRouter();
    const logout = useAdminAuth((s) => s.logout);

    const [state, setState] = useState<ViewState>("loading");
    const [rows, setRows] = useState<ReportItem[]>([]);
    const [meta, setMeta] = useState<{ current_page: number; last_page: number; total: number } | null>(null);
    const [errMsg, setErrMsg] = useState("");

    const [search, setSearch] = useState("");
    const [category, setCategory] = useState<ReportCategory | "">("");
    const [page, setPage] = useState(1);

    const [deleting, setDeleting] = useState<ReportItem | null>(null);
    const [delLoading, setDelLoading] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<ReportItem | null>(null);

    async function load() {
        setState("loading");
        try {
            const res = await getReportList({ search, category, page });
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
    useEffect(() => { load(); }, [page, category]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        const t = setTimeout(() => { setPage(1); load(); }, 400);
        return () => clearTimeout(t);
    }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

    async function confirmDelete() {
        if (!deleting) return;
        setDelLoading(true);
        try {
            await deleteReport(deleting.slug);
            setDeleting(null);
            load();
        } catch (err) {
            const code = err instanceof Error ? err.message : "SERVER";
            if (code === "UNAUTHORIZED") { await logout(); router.replace("/login"); return; }
            alert(friendlyError(code));
        } finally {
            setDelLoading(false);
        }
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-on-surface">Manajemen Laporan</h2>
                    <p className="text-sm text-on-surface-variant mt-1">Kelola dan publikasikan laporan rutin program wakaf.</p>
                </div>
                <button
                    onClick={() => { setEditing(null); setFormOpen(true); }}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container transition-colors self-start sm:self-auto">
                    <Icon name="add" className="text-[18px]" /> Tambah Laporan
                </button>
            </div>

            {/* Filter */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-t-xl border-b-0 p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="relative w-full sm:max-w-xs">
                    <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]" />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari judul laporan..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                </div>
                <select value={category} onChange={(e) => { setCategory(e.target.value as ReportCategory | ""); setPage(1); }}
                    className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none">
                    <option value="">Semua Kategori</option>
                    <option value="tahunan">Laporan Tahunan</option>
                    <option value="keuangan">Laporan Keuangan</option>
                    <option value="program">Laporan Program</option>
                </select>
            </div>

            {state === "loading" ? (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-b-xl p-5 animate-pulse">
                    {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-surface-container rounded mb-2" />)}
                </div>
            ) : state === "error" ? (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-b-xl flex flex-col items-center justify-center text-center py-16">
                    <div className="w-14 h-14 rounded-full bg-error-container flex items-center justify-center text-on-error-container mb-4"><Icon name="cloud_off" className="text-[28px]" /></div>
                    <h3 className="text-lg font-semibold text-on-surface">Gagal Memuat Data</h3>
                    <p className="text-sm text-on-surface-variant mt-1">{errMsg}</p>
                    <button onClick={load} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container transition-colors"><Icon name="refresh" className="text-[18px]" /> Coba Lagi</button>
                </div>
            ) : rows.length === 0 ? (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-b-xl flex flex-col items-center justify-center text-center py-16">
                    <Icon name="assessment" className="text-[40px] text-outline-variant mb-3" />
                    <h3 className="text-base font-semibold text-on-surface">Belum Ada Laporan</h3>
                    <p className="text-sm text-on-surface-variant mt-1">{search || category ? "Tidak ada yang cocok dengan filter." : "Tambahkan laporan pertama Anda."}</p>
                </div>
            ) : (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-b-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm min-w-[760px]">
                            <thead>
                                <tr className="bg-surface-container-low/50 border-b border-outline-variant text-xs uppercase tracking-wide text-on-surface-variant">
                                    <th className="px-5 py-3 font-semibold">Judul</th>
                                    <th className="px-5 py-3 font-semibold">Kategori</th>
                                    <th className="px-5 py-3 font-semibold">Tahun</th>
                                    <th className="px-5 py-3 font-semibold">File</th>
                                    <th className="px-5 py-3 font-semibold text-center">Status</th>
                                    <th className="px-5 py-3 font-semibold text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant/60">
                                {rows.map((r) => (
                                    <tr key={r.id} className="hover:bg-surface-container-low transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-12 rounded border border-outline-variant bg-surface overflow-hidden shrink-0">
                                                    {r.cover_url ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={r.cover_url} alt={r.title} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center"><Icon name="description" className="text-[16px] text-outline-variant" /></div>
                                                    )}
                                                </div>
                                                <span className="font-medium text-on-surface line-clamp-2 max-w-[320px]">{r.title}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-on-surface-variant">{CATEGORY_LABEL[r.category]}</td>
                                        <td className="px-5 py-4 text-on-surface-variant">{r.year ?? "—"}</td>
                                        <td className="px-5 py-4">
                                            {r.file_url ? (
                                                <a href={r.file_url} target="_blank" rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 text-primary hover:underline">
                                                    <Icon name="picture_as_pdf" className="text-[18px]" /> Lihat PDF
                                                </a>
                                            ) : (
                                                <span className="text-on-surface-variant">—</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide ${r.is_published ? "bg-primary/10 text-primary" : "bg-surface-container-high text-on-surface-variant"}`}>
                                                {r.is_published ? "Published" : "Draft"}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex justify-end gap-1">
                                                <button onClick={() => { setEditing(r); setFormOpen(true); }}
                                                    className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors" title="Edit"><Icon name="edit" className="text-[18px]" /></button>
                                                <button onClick={() => setDeleting(r)}
                                                    className="p-2 rounded-lg text-error hover:bg-error-container/30 transition-colors" title="Hapus"><Icon name="delete" className="text-[18px]" /></button>
                                            </div>
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

            <ReportFormModal
                open={formOpen}
                item={editing}
                onClose={() => setFormOpen(false)}
                onSaved={() => { setFormOpen(false); load(); }}
            />

            <ConfirmDialog
                open={!!deleting}
                title="Hapus Laporan"
                message={`Yakin ingin menghapus laporan "${deleting?.title}"? (akan diarsipkan / soft delete)`}
                confirmLabel="Hapus"
                danger
                loading={delLoading}
                onConfirm={confirmDelete}
                onClose={() => setDeleting(null)}
            />
        </div>
    );
}