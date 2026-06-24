"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { savePartner } from "@/services/partner";
import type { Partner } from "@/types";

export function PartnerFormModal({ open, item, onClose, onSaved }: {
    open: boolean;
    item: Partner | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    const isEdit = Boolean(item);

    const [name, setName] = useState("");
    const [type, setType] = useState("");
    const [picName, setPicName] = useState("");
    const [picPhone, setPicPhone] = useState("");
    const [picEmail, setPicEmail] = useState("");
    const [isVisible, setIsVisible] = useState(true);
    const [logo, setLogo] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setName(item?.name ?? "");
        setType(item?.type ?? "");
        setPicName(item?.pic_name ?? "");
        setPicPhone(item?.pic_phone ?? "");
        setPicEmail(item?.pic_email ?? "");
        setIsVisible(item?.is_visible ?? true);
        setLogo(null);
        setPreview(item?.logo_url ?? null);
        setErr(null);
    }, [open, item]);

    function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0];
        if (!f) return;
        if (f.size > 10 * 1024 * 1024) { setErr("Logo maksimal 10MB."); return; }
        setLogo(f);
        setPreview(URL.createObjectURL(f));
        setErr(null);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErr(null);
        if (!name.trim()) { setErr("Nama mitra wajib diisi."); return; }
        if (picEmail && !/^\S+@\S+\.\S+$/.test(picEmail)) { setErr("Format email PIC tidak valid."); return; }
        setLoading(true);
        try {
            await savePartner(
                {
                    name: name.trim(),
                    type: type.trim() || undefined,
                    pic_name: picName.trim() || undefined,
                    pic_phone: picPhone.trim() || undefined,
                    pic_email: picEmail.trim() || undefined,
                    is_visible: isVisible,
                    logo,
                },
                item?.id
            );
            onSaved();
        } catch (e2) {
            setErr(e2 instanceof Error ? e2.message : "Gagal menyimpan mitra.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Modal open={open} onClose={loading ? () => { } : onClose} title={isEdit ? "Edit Mitra" : "Tambah Mitra"} maxWidth="max-w-xl">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {err && (
                    <div className="flex items-start gap-2 rounded-lg bg-error-container px-4 py-3 text-sm text-on-error-container">
                        <Icon name="error" className="text-[18px] mt-0.5" /> <span>{err}</span>
                    </div>
                )}

                {/* Logo */}
                <div>
                    <span className="text-sm font-medium text-on-surface">Logo Mitra</span>
                    <div className="mt-1.5 flex items-center gap-4">
                        <div className="w-20 h-20 rounded-lg border border-outline-variant bg-surface flex items-center justify-center overflow-hidden shrink-0">
                            {preview ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={preview} alt="logo" className="w-full h-full object-contain p-1" />
                            ) : (
                                <Icon name="handshake" className="text-[28px] text-outline-variant" />
                            )}
                        </div>
                        <label className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm text-on-surface hover:bg-surface-container transition-colors">
                            <Icon name="upload" className="text-[18px]" /> Pilih Logo
                            <input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" onChange={handleLogo} className="hidden" />
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium text-on-surface">Nama Mitra <span className="text-error">*</span></span>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Bank Syariah Indonesia"
                            className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                    </label>
                    <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium text-on-surface">Jenis <span className="text-on-surface-variant font-normal text-xs">(opsional)</span></span>
                        <input type="text" value={type} onChange={(e) => setType(e.target.value)} placeholder="mis. Perbankan / Korporasi"
                            className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                    </label>
                </div>

                {/* PIC */}
                <div className="rounded-lg border border-outline-variant/60 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-2">Narahubung (PIC) — opsional</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input type="text" value={picName} onChange={(e) => setPicName(e.target.value)} placeholder="Nama PIC"
                            className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary outline-none" />
                        <input type="tel" value={picPhone} onChange={(e) => setPicPhone(e.target.value)} placeholder="No HP PIC"
                            className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary outline-none" />
                        <input type="email" value={picEmail} onChange={(e) => setPicEmail(e.target.value)} placeholder="Email PIC"
                            className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary outline-none" />
                    </div>
                </div>

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
                        {loading ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Mitra"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}