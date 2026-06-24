"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Testimonial } from "@/types";
import { getTestimonials, deleteTestimonial, saveTestimonial } from "@/services/testimonial";
import { useAdminAuth } from "@/stores/auth";
import { friendlyError } from "@/lib/errors";
import { Icon } from "@/components/ui/Icon";
import { TestimonialFormModal } from "@/components/testimonial/TestimonialFormModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type ViewState = "loading" | "ready" | "error";

export default function TestimoniPage() {
    const router = useRouter();
    const logout = useAdminAuth((s) => s.logout);

    const [state, setState] = useState<ViewState>("loading");
    const [items, setItems] = useState<Testimonial[]>([]);
    const [errMsg, setErrMsg] = useState("");
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Testimonial | null>(null);
    const [deleting, setDeleting] = useState<Testimonial | null>(null);
    const [delLoading, setDelLoading] = useState(false);
    const [togglingId, setTogglingId] = useState<number | null>(null);

    async function load() {
        setState("loading");
        try {
            setItems(await getTestimonials());
            setState("ready");
        } catch (err) {
            const code = err instanceof Error ? err.message : "SERVER";
            if (code === "UNAUTHORIZED") { await logout(); router.replace("/login"); return; }
            setErrMsg(friendlyError(code));
            setState("error");
        }
    }
    useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    async function confirmDelete() {
        if (!deleting) return;
        setDelLoading(true);
        try {
            await deleteTestimonial(deleting.id);
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

    async function toggleVisible(t: Testimonial) {
        const next = !t.is_visible;
        setTogglingId(t.id);
        setItems((prev) => prev.map((x) => (x.id === t.id ? { ...x, is_visible: next } : x)));
        try {
            await saveTestimonial(
                { name: t.name, title: t.title ?? undefined, content: t.content, is_visible: next, order: t.order },
                t.id
            );
        } catch (err) {
            setItems((prev) => prev.map((x) => (x.id === t.id ? { ...x, is_visible: t.is_visible } : x)));
            const code = err instanceof Error ? err.message : "SERVER";
            if (code === "UNAUTHORIZED") { await logout(); router.replace("/login"); return; }
            alert(friendlyError(code));
        } finally {
            setTogglingId(null);
        }
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-on-surface">Testimoni</h2>
                    <p className="text-sm text-on-surface-variant mt-1">Testimoni tokoh/donatur yang tampil di landing page.</p>
                </div>
                <button onClick={() => { setEditing(null); setFormOpen(true); }}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container transition-colors self-start sm:self-auto">
                    <Icon name="add" className="text-[18px]" /> Tambah Testimoni
                </button>
            </div>

            {state === "loading" ? (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 animate-pulse">
                    {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 bg-surface-container rounded mb-2" />)}
                </div>
            ) : state === "error" ? (
                <div className="flex flex-col items-center justify-center text-center py-20">
                    <div className="w-14 h-14 rounded-full bg-error-container flex items-center justify-center text-on-error-container mb-4"><Icon name="cloud_off" className="text-[28px]" /></div>
                    <h3 className="text-lg font-semibold text-on-surface">Gagal Memuat Data</h3>
                    <p className="text-sm text-on-surface-variant mt-1">{errMsg}</p>
                    <button onClick={load} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container transition-colors"><Icon name="refresh" className="text-[18px]" /> Coba Lagi</button>
                </div>
            ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-20 border border-dashed border-outline-variant rounded-xl">
                    <Icon name="format_quote" className="text-[40px] text-outline-variant mb-3" />
                    <h3 className="text-base font-semibold text-on-surface">Belum Ada Testimoni</h3>
                    <p className="text-sm text-on-surface-variant mt-1">Tambahkan testimoni pertama Anda.</p>
                </div>
            ) : (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.04)] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm min-w-[720px]">
                            <thead>
                                <tr className="bg-surface-container-low/50 border-b border-outline-variant text-xs uppercase tracking-wide text-on-surface-variant">
                                    <th className="px-5 py-3 font-semibold w-20">Urutan</th>
                                    <th className="px-5 py-3 font-semibold">Nama</th>
                                    <th className="px-5 py-3 font-semibold">Posisi / Institusi</th>
                                    <th className="px-5 py-3 font-semibold text-center">Tampil</th>
                                    <th className="px-5 py-3 font-semibold text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant/60">
                                {items.map((t) => (
                                    <tr key={t.id} className="hover:bg-surface-container-low transition-colors">
                                        <td className="px-5 py-4 font-mono text-on-surface-variant">{String(t.order).padStart(2, "0")}</td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full border border-outline-variant bg-surface flex items-center justify-center overflow-hidden shrink-0">
                                                    {t.photo_url ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={t.photo_url} alt={t.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Icon name="person" className="text-[18px] text-on-surface-variant" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-on-surface">{t.name}</p>
                                                    <p className="text-xs text-on-surface-variant line-clamp-1 max-w-[260px]">{t.content}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-on-surface-variant">{t.title ?? "—"}</td>
                                        <td className="px-5 py-4">
                                            <div className="flex justify-center">
                                                <button onClick={() => toggleVisible(t)} disabled={togglingId === t.id} role="switch" aria-checked={t.is_visible}
                                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${t.is_visible ? "bg-primary-container" : "bg-outline-variant"}`}>
                                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${t.is_visible ? "translate-x-[18px]" : "translate-x-1"}`} />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex justify-end gap-1">
                                                <button onClick={() => { setEditing(t); setFormOpen(true); }} className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors" title="Edit"><Icon name="edit" className="text-[18px]" /></button>
                                                <button onClick={() => setDeleting(t)} className="p-2 rounded-lg text-error hover:bg-error-container/30 transition-colors" title="Hapus"><Icon name="delete" className="text-[18px]" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <TestimonialFormModal open={formOpen} item={editing} onClose={() => setFormOpen(false)} onSaved={() => { setFormOpen(false); load(); }} />
            <ConfirmDialog
                open={!!deleting}
                title="Hapus Testimoni"
                message={`Yakin ingin menghapus testimoni dari "${deleting?.name}"?`}
                confirmLabel="Hapus"
                danger
                loading={delLoading}
                onConfirm={confirmDelete}
                onClose={() => setDeleting(null)}
            />
        </div>
    );
}