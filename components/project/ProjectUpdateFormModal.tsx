"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { saveProjectUpdate } from "@/services/project";
import type { ProjectUpdate } from "@/types";

export function ProjectUpdateFormModal({ open, projectSlug, update, onClose, onSaved }: {
    open: boolean;
    projectSlug: string;
    update: ProjectUpdate | null; // null = Tambah
    onClose: () => void;
    onSaved: () => void;
}) {
    const isEdit = Boolean(update);

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [publishedAt, setPublishedAt] = useState("");
    const [images, setImages] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setTitle(update?.title ?? "");
        setContent(update?.content ?? "");
        // ambil tanggal (YYYY-MM-DD) dari ISO untuk input date
        setPublishedAt(update?.published_at ? update.published_at.slice(0, 10) : "");
        setImages([]);
        setPreviews(update?.image_urls ?? []);
        setErr(null);
    }, [open, update]);

    function handleImages(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files ?? []);
        if (files.length > 10) { setErr("Maksimal 10 gambar."); return; }
        if (files.some((f) => f.size > 10 * 1024 * 1024)) { setErr("Setiap gambar maksimal 10MB."); return; }
        setImages(files);
        setPreviews(files.map((f) => URL.createObjectURL(f)));
        setErr(null);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErr(null);
        if (!title.trim()) { setErr("Judul update wajib diisi."); return; }
        setLoading(true);
        try {
            await saveProjectUpdate(
                projectSlug,
                { title: title.trim(), content, published_at: publishedAt || undefined, images },
                update?.id
            );
            onSaved();
        } catch (e2) {
            setErr(e2 instanceof Error ? e2.message : "Gagal menyimpan update.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Modal open={open} onClose={loading ? () => { } : onClose} title={isEdit ? "Edit Update" : "Tambah Update"} maxWidth="max-w-xl">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {err && (
                    <div className="flex items-start gap-2 rounded-lg bg-error-container px-4 py-3 text-sm text-on-error-container">
                        <Icon name="error" className="text-[18px] mt-0.5" /> <span>{err}</span>
                    </div>
                )}

                <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-on-surface">Judul <span className="text-error">*</span></span>
                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="mis. Survei Geolistrik Tahap 2 Selesai"
                        className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                </label>

                <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-on-surface">Isi / Keterangan</span>
                    <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} placeholder="Tuliskan perkembangan terbaru project..."
                        className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors resize-none" />
                </label>

                <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-on-surface">Tanggal Update</span>
                    <input type="date" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)}
                        className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none" />
                    <span className="text-xs text-on-surface-variant">Kosongkan untuk pakai tanggal hari ini.</span>
                </label>

                <div>
                    <span className="text-sm font-medium text-on-surface">Gambar (maks 10)</span>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                        {previews.map((src, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={i} src={src} alt={`gambar ${i + 1}`} className="w-20 h-20 rounded-lg object-cover border border-outline-variant" />
                        ))}
                        <label className="w-20 h-20 rounded-lg border-2 border-dashed border-outline-variant flex items-center justify-center cursor-pointer hover:bg-surface-container transition-colors text-on-surface-variant">
                            <Icon name="add_photo_alternate" className="text-[24px]" />
                            <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImages} className="hidden" />
                        </label>
                    </div>
                    {isEdit && <p className="text-xs text-on-surface-variant mt-1.5">Memilih gambar baru akan mengganti semua gambar lama.</p>}
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={onClose} disabled={loading}
                        className="rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container disabled:opacity-50 transition-colors">Batal</button>
                    <button type="submit" disabled={loading}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container disabled:opacity-60 transition-colors">
                        {loading && <Icon name="progress_activity" className="text-[18px] animate-spin" />}
                        {loading ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Update"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}