"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { saveProgram } from "@/services/program";
import type { Program, ProgramStatus } from "@/types";

function slugify(s: string) {
    return s.toLowerCase().trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
}

export function ProgramFormModal({ open, program, onClose, onSaved }: {
    open: boolean;
    program: Program | null;        // null = mode Tambah
    onClose: () => void;
    onSaved: () => void;
}) {
    const isEdit = Boolean(program);

    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [slugTouched, setSlugTouched] = useState(false);
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState<ProgramStatus>("aktif");
    const [order, setOrder] = useState(0);
    const [image, setImage] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [removeImg, setRemoveImg] = useState(false);

    // Reset / prefill saat modal dibuka
    useEffect(() => {
        if (!open) return;
        setName(program?.name ?? "");
        setSlug(program?.slug ?? "");
        setSlugTouched(false);
        setDescription(program?.description ?? "");
        setStatus(program?.status ?? "aktif");
        setOrder(program?.order ?? 0);
        setImage(null);
        setRemoveImg(false);
        setPreview(program?.image_url ?? null);
        setErr(null);
    }, [open, program]);

    // Auto-slug dari nama (selama slug belum diutak-atik manual)
    useEffect(() => {
        if (!slugTouched) setSlug(slugify(name));
    }, [name, slugTouched]);

    function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) { setErr("Ukuran gambar maksimal 10MB."); return; }
        setImage(file);
        setPreview(URL.createObjectURL(file));
        setRemoveImg(false);
        setErr(null);
    }

    function removeImage() {
        setImage(null);
        setPreview(null);
        setRemoveImg(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErr(null);
        if (!name.trim()) { setErr("Nama program wajib diisi."); return; }
        setLoading(true);
        try {
            await saveProgram(
                { name: name.trim(), slug: slug || undefined, description, status, order, image, remove_image: removeImg },
                program?.slug // jika ada → mode update
            );
            onSaved();
        } catch (e2) {
            setErr(e2 instanceof Error ? e2.message : "Gagal menyimpan program.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Modal open={open} onClose={loading ? () => { } : onClose} title={isEdit ? "Edit Program" : "Tambah Program"}>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {err && (
                    <div className="flex items-start gap-2 rounded-lg bg-error-container px-4 py-3 text-sm text-on-error-container">
                        <Icon name="error" className="text-[18px] mt-0.5" /> <span>{err}</span>
                    </div>
                )}

                {/* Gambar */}
                <div>
                    <span className="text-sm font-medium text-on-surface">Gambar Program</span>
                    <div className="mt-1.5 flex items-center gap-4">
                        <div className="w-24 h-24 rounded-lg border border-outline-variant bg-surface-container overflow-hidden flex items-center justify-center shrink-0">
                            {preview ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={preview} alt="preview" className="w-full h-full object-cover" />
                            ) : (
                                <Icon name="image" className="text-[28px] text-outline-variant" />
                            )}
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm text-on-surface hover:bg-surface-container transition-colors">
                                <Icon name="upload" className="text-[18px]" /> {preview ? "Ganti Gambar" : "Pilih Gambar"}
                                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImage} className="hidden" />
                            </label>
                            {preview && (
                                <button type="button" onClick={removeImage}
                                    className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm text-error hover:bg-error-container/30 transition-colors">
                                    <Icon name="delete" className="text-[18px]" /> Hapus Gambar
                                </button>
                            )}
                        </div>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-1.5">JPG, PNG, atau WEBP. Maks 10MB.</p>
                </div>

                {/* Nama */}
                <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-on-surface">Nama Program <span className="text-error">*</span></span>
                    <input
                        type="text" value={name} onChange={(e) => setName(e.target.value)}
                        placeholder="mis. Wakaf Infrastruktur"
                        className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                    />
                </label>

                {/* Slug */}
                <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-on-surface">Slug</span>
                    <input
                        type="text" value={slug}
                        onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true); }}
                        placeholder="wakaf-infrastruktur"
                        className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm font-mono text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                    />
                    <span className="text-xs text-on-surface-variant">Dibuat otomatis dari nama. Bisa diubah.</span>
                </label>

                {/* Deskripsi */}
                <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-on-surface">Deskripsi</span>
                    <textarea
                        value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                        placeholder="Deskripsi singkat program..."
                        className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors resize-none"
                    />
                </label>

                {/* Status + Urutan */}
                <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium text-on-surface">Status</span>
                        <select
                            value={status} onChange={(e) => setStatus(e.target.value as ProgramStatus)}
                            className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none"
                        >
                            <option value="aktif">Aktif</option>
                            <option value="nonaktif">Nonaktif</option>
                        </select>
                    </label>
                    <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium text-on-surface">Urutan Tampil</span>
                        <input
                            type="number" min={0} value={order} onChange={(e) => setOrder(Number(e.target.value))}
                            className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                        />
                    </label>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={onClose} disabled={loading}
                        className="rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container disabled:opacity-50 transition-colors">
                        Batal
                    </button>
                    <button type="submit" disabled={loading}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container disabled:opacity-60 transition-colors">
                        {loading && <Icon name="progress_activity" className="text-[18px] animate-spin" />}
                        {loading ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Program"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}