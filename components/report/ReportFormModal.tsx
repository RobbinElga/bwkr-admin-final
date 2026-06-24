"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { saveReport } from "@/services/report";
import type { ReportItem, ReportCategory } from "@/types";

function slugify(s: string) {
    return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

const CATEGORIES: { value: ReportCategory; label: string }[] = [
    { value: "tahunan", label: "Laporan Tahunan" },
    { value: "keuangan", label: "Laporan Keuangan" },
    { value: "program", label: "Laporan Program" },
];

export function ReportFormModal({ open, item, onClose, onSaved }: {
    open: boolean;
    item: ReportItem | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    const isEdit = Boolean(item);

    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [slugTouched, setSlugTouched] = useState(false);
    const [category, setCategory] = useState<ReportCategory>("tahunan");
    const [year, setYear] = useState("");
    const [description, setDescription] = useState("");
    const [isPublished, setIsPublished] = useState(true);

    const [cover, setCover] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setTitle(item?.title ?? "");
        setSlug(item?.slug ?? "");
        setSlugTouched(false);
        setCategory(item?.category ?? "tahunan");
        setYear(item?.year != null ? String(item.year) : "");
        setDescription(item?.description ?? "");
        setIsPublished(item?.is_published ?? true);
        setCover(null);
        setCoverPreview(item?.cover_url ?? null);
        setFile(null);
        setFileName(item?.file_url ? (item.file_url.split("/").pop() ?? "File PDF") : null);
        setErr(null);
    }, [open, item]);

    useEffect(() => {
        if (!slugTouched && !isEdit) setSlug(slugify(title));
    }, [title, slugTouched, isEdit]);

    function handleCover(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0];
        if (!f) return;
        if (f.size > 10 * 1024 * 1024) { setErr("Gambar maksimal 10MB."); return; }
        setCover(f);
        setCoverPreview(URL.createObjectURL(f));
        setErr(null);
    }

    function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0];
        if (!f) return;
        if (f.size > 10 * 1024 * 1024) { setErr("File PDF maksimal 10MB."); return; }
        setFile(f);
        setFileName(f.name);
        setErr(null);
    }

    async function submit() {
        setErr(null);
        if (!title.trim()) { setErr("Nama laporan wajib diisi."); return; }
        if (!isEdit && !file) { setErr("File PDF laporan wajib diunggah."); return; }
        setLoading(true);
        try {
            await saveReport(
                {
                    title: title.trim(),
                    slug: slug || undefined,
                    category,
                    year: year ? Number(year) : null,
                    description: description.trim() || undefined,
                    is_published: isPublished,
                    cover,
                    file,
                },
                item?.slug
            );
            onSaved();
        } catch (e2) {
            setErr(e2 instanceof Error ? e2.message : "Gagal menyimpan laporan.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Modal open={open} onClose={loading ? () => { } : onClose} title={isEdit ? "Edit Laporan" : "Tambah Laporan Baru"} maxWidth="max-w-3xl">
            <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex flex-col gap-4">
                {err && (
                    <div className="flex items-start gap-2 rounded-lg bg-error-container px-4 py-3 text-sm text-on-error-container">
                        <Icon name="error" className="text-[18px] mt-0.5" /> <span>{err}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Kiri: data utama */}
                    <div className="lg:col-span-2 flex flex-col gap-4">
                        <label className="flex flex-col gap-1.5">
                            <span className="text-sm font-medium text-on-surface">Nama Laporan <span className="text-error">*</span></span>
                            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contoh: Laporan Tahunan Pengelolaan Wakaf 2023"
                                className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                        </label>

                        <label className="flex flex-col gap-1.5">
                            <span className="text-sm font-medium text-on-surface">URL Slug</span>
                            <div className="flex rounded-lg overflow-hidden border border-outline-variant focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-colors">
                                <span className="bg-surface-container px-3 py-2.5 border-r border-outline-variant text-on-surface-variant font-mono text-xs flex items-center whitespace-nowrap">/laporan/</span>
                                <input type="text" value={slug} onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true); }} placeholder="judul-laporan"
                                    className="w-full bg-surface px-3 py-2.5 text-sm font-mono text-on-surface outline-none" />
                            </div>
                        </label>

                        <div className="grid grid-cols-2 gap-4">
                            <label className="flex flex-col gap-1.5">
                                <span className="text-sm font-medium text-on-surface">Kategori <span className="text-error">*</span></span>
                                <select value={category} onChange={(e) => setCategory(e.target.value as ReportCategory)}
                                    className="rounded-lg border border-outline-variant bg-surface px-3 py-2.5 text-sm text-on-surface focus:border-primary outline-none">
                                    {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                                </select>
                            </label>
                            <label className="flex flex-col gap-1.5">
                                <span className="text-sm font-medium text-on-surface">Tahun</span>
                                <input type="number" step="any" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2024"
                                    className="rounded-lg border border-outline-variant bg-surface px-3 py-2.5 text-sm text-on-surface focus:border-primary outline-none" />
                            </label>
                        </div>

                        <label className="flex flex-col gap-1.5">
                            <span className="text-sm font-medium text-on-surface">Deskripsi</span>
                            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Ringkasan isi laporan (opsional)..."
                                className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2.5 text-sm text-on-surface focus:border-primary outline-none resize-none" />
                        </label>
                    </div>

                    {/* Kanan: publikasi + berkas */}
                    <div className="flex flex-col gap-4">
                        <div className="rounded-lg border border-outline-variant p-4 flex flex-col gap-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Publikasi</p>
                            <label className="flex flex-col gap-1.5">
                                <span className="text-sm text-on-surface">Status</span>
                                <select value={isPublished ? "1" : "0"} onChange={(e) => setIsPublished(e.target.value === "1")}
                                    className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary outline-none">
                                    <option value="1">Published (tampil publik)</option>
                                    <option value="0">Draft</option>
                                </select>
                            </label>
                        </div>

                        {/* Sampul */}
                        <div className="rounded-lg border border-outline-variant p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-2">Gambar Sampul</p>
                            <div className="aspect-[3/4] rounded-lg border border-outline-variant bg-surface overflow-hidden mb-2 flex items-center justify-center">
                                {coverPreview ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={coverPreview} alt="cover" className="w-full h-full object-cover" />
                                ) : (
                                    <Icon name="image" className="text-[32px] text-outline-variant" />
                                )}
                            </div>
                            <label className="cursor-pointer w-full inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant py-2 text-sm text-on-surface hover:bg-surface-container transition-colors">
                                <Icon name="upload" className="text-[18px]" /> {coverPreview ? "Ganti Sampul" : "Unggah Sampul"}
                                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCover} className="hidden" />
                            </label>
                        </div>

                        {/* File PDF */}
                        <div className="rounded-lg border border-outline-variant p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-2">
                                File Laporan (PDF) {!isEdit && <span className="text-error">*</span>}
                            </p>
                            {fileName && (
                                <div className="flex items-center gap-2 text-sm text-primary mb-2">
                                    <Icon name="picture_as_pdf" className="text-[18px]" /> <span className="truncate">{fileName}</span>
                                </div>
                            )}
                            <label className="cursor-pointer w-full inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant py-2 text-sm text-on-surface hover:bg-surface-container transition-colors">
                                <Icon name="upload_file" className="text-[18px]" /> {fileName ? "Ganti File" : "Unggah PDF"}
                                <input type="file" accept="application/pdf" onChange={handleFile} className="hidden" />
                            </label>
                            <p className="text-[11px] text-on-surface-variant mt-1.5">Hanya PDF, maksimal 10MB.</p>
                        </div>
                    </div>
                </div>

                {/* Aksi */}
                <div className="flex justify-end gap-3 pt-2 border-t border-outline-variant mt-1">
                    <button type="button" onClick={onClose} disabled={loading}
                        className="rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container disabled:opacity-50 transition-colors">Batal</button>
                    <button type="submit" disabled={loading}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container disabled:opacity-60 transition-colors">
                        {loading ? <Icon name="progress_activity" className="text-[18px] animate-spin" /> : <Icon name="save" className="text-[18px]" />}
                        {loading ? "Menyimpan..." : "Simpan Laporan"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}