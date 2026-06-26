"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { saveProject } from "@/services/project";
import { getAdminBankAccounts } from "@/services/bank";
import type { Project, ProjectStatus, BankAccount } from "@/types";
import { formatRupiah } from "@/lib/format";

function slugify(s: string) {
    return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

export function ProjectFormModal({ open, project, programId, programName, onClose, onSaved }: {
    open: boolean;
    project: Project | null;     // null = Tambah
    programId: number;           // program konteks saat ini
    programName: string;
    onClose: () => void;
    onSaved: () => void;
}) {
    const isEdit = Boolean(project);

    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [slugTouched, setSlugTouched] = useState(false);
    const [description, setDescription] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [target, setTarget] = useState(0);
    const [status, setStatus] = useState<ProjectStatus>("draft");
    const [images, setImages] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);

    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [banks, setBanks] = useState<BankAccount[]>([]);
    const [selectedBankIds, setSelectedBankIds] = useState<number[]>([]);

    const [existing, setExisting] = useState<string[]>([]);
    const [newFiles, setNewFiles] = useState<File[]>([]);
    const [newPreviews, setNewPreviews] = useState<string[]>([]);

    useEffect(() => {
        if (!open) return;
        setName(project?.name ?? "");
        setSlug(project?.slug ?? "");
        setSlugTouched(false);
        setDescription(project?.description ?? "");
        setStartDate(project?.start_date ?? "");
        setEndDate(project?.end_date ?? "");
        setTarget(project?.target_amount ?? 0);
        setStatus(project?.status ?? "draft");
        setExisting(project?.image_urls ?? []);
        setNewFiles([]);
        setNewPreviews([]);
        setSelectedBankIds(project?.bank_accounts?.map((b) => b.id) ?? []);
        getAdminBankAccounts().then(setBanks).catch(() => setBanks([]));
        setErr(null);
    }, [open, project]);

    useEffect(() => {
        if (!slugTouched) setSlug(slugify(name));
    }, [name, slugTouched]);

    function handleAddImages(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files ?? []);
        e.target.value = ""; // reset agar bisa pilih file yang sama lagi
        if (existing.length + newFiles.length + files.length > 10) { setErr("Maksimal 10 gambar."); return; }
        if (files.find((f) => f.size > 10 * 1024 * 1024)) { setErr("Setiap gambar maksimal 10MB."); return; }
        setNewFiles((prev) => [...prev, ...files]);
        setNewPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
        setErr(null);
    }
    function removeExisting(i: number) {
        setExisting((prev) => prev.filter((_, idx) => idx !== i));
    }
    function removeNew(i: number) {
        setNewFiles((prev) => prev.filter((_, idx) => idx !== i));
        setNewPreviews((prev) => prev.filter((_, idx) => idx !== i));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErr(null);
        if (!name.trim()) { setErr("Nama project wajib diisi."); return; }
        if (endDate && startDate && endDate < startDate) { setErr("Tanggal selesai harus setelah tanggal mulai."); return; }
        setLoading(true);
        try {
            await saveProject(
                {
                    program_id: programId,
                    name: name.trim(),
                    slug: slug || undefined,
                    description,
                    start_date: startDate || undefined,
                    end_date: endDate || undefined,
                    target_amount: target,
                    status,
                    images: newFiles,
                    kept_images: existing,
                    bank_account_ids: selectedBankIds,
                },
                project?.slug
            );
            onSaved();
        } catch (e2) {
            setErr(e2 instanceof Error ? e2.message : "Gagal menyimpan project.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Modal open={open} onClose={loading ? () => { } : onClose} title={isEdit ? "Edit Project" : "Tambah Project"} maxWidth="max-w-2xl">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {err && (
                    <div className="flex items-start gap-2 rounded-lg bg-error-container px-4 py-3 text-sm text-on-error-container">
                        <Icon name="error" className="text-[18px] mt-0.5" /> <span>{err}</span>
                    </div>
                )}

                <div className="rounded-lg bg-surface-container-low px-4 py-2.5 text-sm text-on-surface-variant flex items-center gap-2">
                    <Icon name="account_tree" className="text-[18px] text-primary" />
                    Program: <span className="font-semibold text-on-surface">{programName}</span>
                </div>

                {/* Gambar (galeri) */}
                <div>
                    <span className="text-sm font-medium text-on-surface">Gambar Project (maks 10)</span>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                        {existing.map((src, i) => (
                            <div key={`e-${i}`} className="relative w-20 h-20">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={src} alt={`gambar ${i + 1}`} className="w-20 h-20 rounded-lg object-cover border border-outline-variant" />
                                <button type="button" onClick={() => removeExisting(i)}
                                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-error text-on-error flex items-center justify-center shadow">
                                    <Icon name="close" className="text-[14px]" />
                                </button>
                            </div>
                        ))}
                        {newPreviews.map((src, i) => (
                            <div key={`n-${i}`} className="relative w-20 h-20">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={src} alt={`baru ${i + 1}`} className="w-20 h-20 rounded-lg object-cover border-2 border-primary/40" />
                                <button type="button" onClick={() => removeNew(i)}
                                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-error text-on-error flex items-center justify-center shadow">
                                    <Icon name="close" className="text-[14px]" />
                                </button>
                            </div>
                        ))}
                        <label className="w-20 h-20 rounded-lg border-2 border-dashed border-outline-variant flex items-center justify-center cursor-pointer hover:bg-surface-container transition-colors text-on-surface-variant">
                            <Icon name="add_photo_alternate" className="text-[24px]" />
                            <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleAddImages} className="hidden" />
                        </label>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-1.5">Klik × untuk hapus. Gambar baru ditambahkan ke yang sudah ada (tidak menimpa).</p>
                </div>

                <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-on-surface">Nama Project <span className="text-error">*</span></span>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Pembangunan Sumur Desa Sukamaju"
                        className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                </label>

                <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-on-surface">Slug</span>
                    <input type="text" value={slug} onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true); }}
                        className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm font-mono text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                </label>

                <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-on-surface">Deskripsi</span>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                        className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors resize-none" />
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium text-on-surface">Tanggal Mulai</span>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                            className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none" />
                    </label>
                    <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium text-on-surface">Tanggal Selesai</span>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                            className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none" />
                    </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium text-on-surface">Target Dana <span className="text-error">*</span></span>
                        <input type="number" min={0} step="any" value={target || ""} onChange={(e) => setTarget(Number(e.target.value))} placeholder="0"
                            className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm font-mono text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                        {target > 0 && <span className="text-xs text-on-surface-variant">{formatRupiah(target)}</span>}
                    </label>
                    <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium text-on-surface">Status</span>
                        <select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                            className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none">
                            <option value="draft">Draft</option>
                            <option value="berjalan">Berjalan</option>
                            <option value="selesai">Selesai</option>
                        </select>
                    </label>
                </div>

                {/* Rekening tujuan donasi project */}
                <div>
                    <span className="text-sm font-medium text-on-surface">Rekening Tujuan Donasi</span>
                    <p className="text-xs text-on-surface-variant mb-2">Donatur akan diarahkan transfer ke rekening yang dipilih untuk project ini.</p>
                    {banks.length === 0 ? (
                        <p className="text-sm text-on-surface-variant">Belum ada rekening. Tambahkan dulu di Keuangan → Rekening Bank.</p>
                    ) : (
                        <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
                            {banks.map((b) => {
                                const checked = selectedBankIds.includes(b.id);
                                return (
                                    <label key={b.id} className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${checked ? "border-primary bg-primary/5" : "border-outline-variant hover:bg-surface-container"}`}>
                                        <input type="checkbox" checked={checked}
                                            onChange={(e) => setSelectedBankIds((prev) => e.target.checked ? [...prev, b.id] : prev.filter((id) => id !== b.id))}
                                            className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" />
                                        <div className="w-8 h-8 rounded border border-outline-variant bg-surface flex items-center justify-center overflow-hidden shrink-0">
                                            {b.logo_url ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={b.logo_url} alt={b.bank_name} className="w-full h-full object-contain p-0.5" />
                                            ) : (
                                                <Icon name="account_balance" className="text-[16px] text-primary" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-on-surface">{b.bank_name}{!b.is_active && <span className="text-xs text-on-surface-variant"> (nonaktif)</span>}</p>
                                            <p className="text-xs text-on-surface-variant font-mono truncate">{b.account_number} • {b.account_name}</p>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={onClose} disabled={loading}
                        className="rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container disabled:opacity-50 transition-colors">Batal</button>
                    <button type="submit" disabled={loading}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container disabled:opacity-60 transition-colors">
                        {loading && <Icon name="progress_activity" className="text-[18px] animate-spin" />}
                        {loading ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Project"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}