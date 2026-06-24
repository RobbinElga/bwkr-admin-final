"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { saveTestimonial } from "@/services/testimonial";
import type { Testimonial } from "@/types";

export function TestimonialFormModal({ open, item, onClose, onSaved }: {
    open: boolean;
    item: Testimonial | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    const isEdit = Boolean(item);

    const [name, setName] = useState("");
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [order, setOrder] = useState(0);
    const [isVisible, setIsVisible] = useState(true);
    const [photo, setPhoto] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setName(item?.name ?? "");
        setTitle(item?.title ?? "");
        setContent(item?.content ?? "");
        setOrder(item?.order ?? 0);
        setIsVisible(item?.is_visible ?? true);
        setPhoto(null);
        setPreview(item?.photo_url ?? null);
        setErr(null);
    }, [open, item]);

    function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0];
        if (!f) return;
        if (f.size > 10 * 1024 * 1024) { setErr("Foto maksimal 10MB."); return; }
        setPhoto(f);
        setPreview(URL.createObjectURL(f));
        setErr(null);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErr(null);
        if (!name.trim()) { setErr("Nama wajib diisi."); return; }
        if (!content.trim()) { setErr("Isi testimoni wajib diisi."); return; }
        setLoading(true);
        try {
            await saveTestimonial(
                { name: name.trim(), title: title.trim() || undefined, content: content.trim(), is_visible: isVisible, order, photo },
                item?.id
            );
            onSaved();
        } catch (e2) {
            setErr(e2 instanceof Error ? e2.message : "Gagal menyimpan testimoni.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Modal open={open} onClose={loading ? () => { } : onClose} title={isEdit ? "Edit Testimoni" : "Tambah Testimoni"} maxWidth="max-w-xl">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {err && (
                    <div className="flex items-start gap-2 rounded-lg bg-error-container px-4 py-3 text-sm text-on-error-container">
                        <Icon name="error" className="text-[18px] mt-0.5" /> <span>{err}</span>
                    </div>
                )}

                {/* Foto */}
                <div>
                    <span className="text-sm font-medium text-on-surface">Foto Profil <span className="text-on-surface-variant font-normal text-xs">(opsional)</span></span>
                    <div className="mt-1.5 flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full border border-outline-variant bg-surface flex items-center justify-center overflow-hidden shrink-0">
                            {preview ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={preview} alt="foto" className="w-full h-full object-cover" />
                            ) : (
                                <Icon name="person" className="text-[26px] text-outline-variant" />
                            )}
                        </div>
                        <label className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm text-on-surface hover:bg-surface-container transition-colors">
                            <Icon name="upload" className="text-[18px]" /> Pilih Foto
                            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhoto} className="hidden" />
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium text-on-surface">Nama <span className="text-error">*</span></span>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Dr. Ahmad Fauzi"
                            className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                    </label>
                    <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium text-on-surface">Posisi / Institusi <span className="text-on-surface-variant font-normal text-xs">(opsional)</span></span>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="mis. Direktur Yayasan"
                            className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                    </label>
                </div>

                <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-on-surface">Isi Testimoni <span className="text-error">*</span></span>
                    <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} placeholder="Tuliskan pengalaman atau testimoni..."
                        className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors resize-none" />
                </label>

                <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-on-surface">Urutan</span>
                    <input type="number" min={0} value={order} onChange={(e) => setOrder(Number(e.target.value))}
                        className="w-32 rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm font-mono text-on-surface focus:border-primary outline-none" />
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={isVisible} onChange={(e) => setIsVisible(e.target.checked)}
                        className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" />
                    <span className="text-sm text-on-surface">Tampilkan di landing page</span>
                </label>

                <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={onClose} disabled={loading}
                        className="rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container disabled:opacity-50 transition-colors">Batal</button>
                    <button type="submit" disabled={loading}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container disabled:opacity-60 transition-colors">
                        {loading && <Icon name="progress_activity" className="text-[18px] animate-spin" />}
                        {loading ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Testimoni"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}