"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { saveAchievement } from "@/services/achievement";
import type { Achievement } from "@/types";

export function AchievementFormModal({ open, item, onClose, onSaved }: {
    open: boolean;
    item: Achievement | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    const isEdit = Boolean(item);

    const [count, setCount] = useState(0);
    const [label, setLabel] = useState("");
    const [period, setPeriod] = useState("");
    const [order, setOrder] = useState(0);
    const [image, setImage] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setCount(item?.count ?? 0);
        setLabel(item?.label ?? "");
        setPeriod(item?.period ?? "");
        setOrder(item?.order ?? 0);
        setImage(null);
        setPreview(item?.image_url ?? null);
        setErr(null);
    }, [open, item]);

    function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0];
        if (!f) return;
        if (f.size > 10 * 1024 * 1024) { setErr("Gambar maksimal 10MB."); return; }
        setImage(f);
        setPreview(URL.createObjectURL(f));
        setErr(null);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErr(null);
        if (!label.trim()) { setErr("Label pencapaian wajib diisi."); return; }
        if (count < 0) { setErr("Nilai tidak boleh negatif."); return; }
        setLoading(true);
        try {
            await saveAchievement(
                { count, label: label.trim(), period: period.trim() || undefined, order, image },
                item?.id
            );
            onSaved();
        } catch (e2) {
            setErr(e2 instanceof Error ? e2.message : "Gagal menyimpan pencapaian.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Modal open={open} onClose={loading ? () => { } : onClose} title={isEdit ? "Edit Pencapaian" : "Tambah Pencapaian"}>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {err && (
                    <div className="flex items-start gap-2 rounded-lg bg-error-container px-4 py-3 text-sm text-on-error-container">
                        <Icon name="error" className="text-[18px] mt-0.5" /> <span>{err}</span>
                    </div>
                )}

                <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-on-surface">Label Pencapaian <span className="text-error">*</span></span>
                    <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="mis. Total Dana Tersalurkan"
                        className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium text-on-surface">Nilai (angka) <span className="text-error">*</span></span>
                        <input type="number" min={0} step="any" value={count || ""} onChange={(e) => setCount(Number(e.target.value))} placeholder="12450"
                            className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm font-mono text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                        {count > 0 && <span className="text-xs text-on-surface-variant">{count.toLocaleString("id-ID")}</span>}
                    </label>
                    <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium text-on-surface">Periode <span className="text-on-surface-variant font-normal text-xs">(opsional)</span></span>
                        <input type="text" value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="mis. 2020 - 2024"
                            className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                    </label>
                </div>

                <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-on-surface">Urutan</span>
                    <input type="number" min={0} value={order} onChange={(e) => setOrder(Number(e.target.value))}
                        className="w-32 rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm font-mono text-on-surface focus:border-primary outline-none" />
                </label>

                <div>
                    <span className="text-sm font-medium text-on-surface">Ikon / Gambar <span className="text-on-surface-variant font-normal text-xs">(opsional)</span></span>
                    <div className="mt-1.5 flex items-center gap-4">
                        <div className="w-16 h-16 rounded-lg border border-outline-variant bg-surface flex items-center justify-center overflow-hidden shrink-0">
                            {preview ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={preview} alt="ikon" className="w-full h-full object-contain p-1" />
                            ) : (
                                <Icon name="emoji_events" className="text-[26px] text-outline-variant" />
                            )}
                        </div>
                        <label className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm text-on-surface hover:bg-surface-container transition-colors">
                            <Icon name="upload" className="text-[18px]" /> Pilih Gambar
                            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImage} className="hidden" />
                        </label>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={onClose} disabled={loading}
                        className="rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container disabled:opacity-50 transition-colors">Batal</button>
                    <button type="submit" disabled={loading}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container disabled:opacity-60 transition-colors">
                        {loading && <Icon name="progress_activity" className="text-[18px] animate-spin" />}
                        {loading ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Pencapaian"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}