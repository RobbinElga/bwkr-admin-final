"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { NewsItem, NewsStatus } from "@/types";
import { getNewsList, deleteNews } from "@/services/news";
import { useAdminAuth } from "@/stores/auth";
import { friendlyError } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { NewsFormModal } from "@/components/news/NewsFormModal";

type ViewState = "loading" | "ready" | "error";

const STATUS: Record<NewsStatus, { label: string; cls: string }> = {
    published: { label: "Published", cls: "bg-primary/10 text-primary" },
    draft: { label: "Draft", cls: "bg-surface-container-high text-on-surface-variant" },
};

export default function BeritaPage() {
    const router = useRouter();
    const logout = useAdminAuth((s) => s.logout);

    const [state, setState] = useState<ViewState>("loading");
    const [rows, setRows] = useState<NewsItem[]>([]);
    const [meta, setMeta] = useState<{ current_page: number; last_page: number; total: number } | null>(null);
    const [errMsg, setErrMsg] = useState("");

    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<NewsStatus | "">("");
    const [page, setPage] = useState(1);

    const [deleting, setDeleting] = useState<NewsItem | null>(null);
    const [delLoading, setDelLoading] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<NewsItem | null>(null);

    async function load() {
        setState("loading");
        try {
            const res = await getNewsList({ search, status, page });
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
    useEffect(() => { load(); }, [page, status]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        const t = setTimeout(() => { setPage(1); load(); }, 400);
        return () => clearTimeout(t);
    }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

    async function confirmDelete() {
        if (!deleting) return;
        setDelLoading(true);
        try {
            await deleteNews(deleting.id);
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
                    <h2 className="text-2xl font-bold text-on-surface">Berita</h2>
                    <p className="text-sm text-on-surface-variant mt-1">Kelola artikel yang tampil di landing page & halaman berita.</p>
                </div>
                <button
                    // TODO: buka editor (sub-langkah berikutnya)
                    onClick={() => { setEditing(null); setFormOpen(true); }}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container transition-colors self-start sm:self-auto">
                    <Icon name="add" className="text-[18px]" /> Tambah Artikel
                </button>
            </div>

            {/* Filter */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-t-xl border-b-0 p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="relative w-full sm:max-w-xs">
                    <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]" />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari judul artikel..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                </div>
                <select value={status} onChange={(e) => { setStatus(e.target.value as NewsStatus | ""); setPage(1); }}
                    className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none">
                    <option value="">Semua Status</option>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
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
                    <Icon name="article" className="text-[40px] text-outline-variant mb-3" />
                    <h3 className="text-base font-semibold text-on-surface">Belum Ada Artikel</h3>
                    <p className="text-sm text-on-surface-variant mt-1">{search || status ? "Tidak ada yang cocok dengan filter." : "Tulis artikel pertama Anda."}</p>
                </div>
            ) : (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-b-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm min-w-[760px]">
                            <thead>
                                <tr className="bg-surface-container-low/50 border-b border-outline-variant text-xs uppercase tracking-wide text-on-surface-variant">
                                    <th className="px-5 py-3 font-semibold">Judul</th>
                                    <th className="px-5 py-3 font-semibold">Kategori</th>
                                    <th className="px-5 py-3 font-semibold">Penulis</th>
                                    <th className="px-5 py-3 font-semibold text-center">Status</th>
                                    <th className="px-5 py-3 font-semibold">Publish</th>
                                    <th className="px-5 py-3 font-semibold text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant/60">
                                {rows.map((n) => {
                                    const st = STATUS[n.status] ?? STATUS.draft;
                                    return (
                                        <tr key={n.id} className="hover:bg-surface-container-low transition-colors">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-9 rounded border border-outline-variant bg-surface overflow-hidden shrink-0">
                                                        {n.featured_image_url ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img src={n.featured_image_url} alt={n.title} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center"><Icon name="image" className="text-[16px] text-outline-variant" /></div>
                                                        )}
                                                    </div>
                                                    <span className="font-medium text-on-surface line-clamp-1 max-w-[320px]">{n.title}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-on-surface-variant">{n.category ?? "—"}</td>
                                            <td className="px-5 py-4 text-on-surface-variant">{n.author ?? "—"}</td>
                                            <td className="px-5 py-4 text-center">
                                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide ${st.cls}`}>{st.label}</span>
                                            </td>
                                            <td className="px-5 py-4 text-on-surface-variant whitespace-nowrap">{n.published_at ? formatDate(n.published_at) : "—"}</td>
                                            <td className="px-5 py-4">
                                                <div className="flex justify-end gap-1">
                                                    <button
                                                        onClick={() => { setEditing(n); setFormOpen(true); }}
                                                        className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors" title="Edit"><Icon name="edit" className="text-[18px]" /></button>
                                                    <button onClick={() => setDeleting(n)} className="p-2 rounded-lg text-error hover:bg-error-container/30 transition-colors" title="Hapus"><Icon name="delete" className="text-[18px]" /></button>
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

            <NewsFormModal
                open={formOpen}
                item={editing}
                onClose={() => setFormOpen(false)}
                onSaved={() => { setFormOpen(false); load(); }}
            />

            <ConfirmDialog
                open={!!deleting}
                title="Hapus Artikel"
                message={`Yakin ingin menghapus artikel "${deleting?.title}"? (akan diarsipkan / soft delete)`}
                confirmLabel="Hapus"
                danger
                loading={delLoading}
                onConfirm={confirmDelete}
                onClose={() => setDeleting(null)}
            />
        </div>
    );
}