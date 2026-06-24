"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { saveBankAccount } from "@/services/bank";
import { formatRupiah } from "@/lib/format";
import type { BankAccount } from "@/types";

async function assetToFile(url: string): Promise<File | null> {
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const blob = await res.blob();
        return new File([blob], url.split("/").pop() || "logo.png", { type: blob.type || "image/png" });
    } catch { return null; }
}

export function BankAccountFormModal({ open, account, onClose, onSaved }: {
    open: boolean;
    account: BankAccount | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    const isEdit = Boolean(account);

    const [type, setType] = useState<"bank" | "qris">("bank");
    const [bankName, setBankName] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [accountName, setAccountName] = useState("");
    const [initialBalance, setInitialBalance] = useState(0);
    const [isActive, setIsActive] = useState(true);

    const [presetLogo, setPresetLogo] = useState<string | null>(null);
    const [logo, setLogo] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);

    const [qrisImage, setQrisImage] = useState<File | null>(null);
    const [qrisPreview, setQrisPreview] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setType(account?.type ?? "bank");
        setBankName(account?.bank_name ?? "");
        setAccountNumber(account?.account_number ?? "");
        setAccountName(account?.account_name ?? "");
        setInitialBalance(account?.initial_balance ?? 0);
        setIsActive(account?.is_active ?? true);
        setPresetLogo(null); setLogo(null); setPreview(account?.logo_url ?? null);
        setQrisImage(null); setQrisPreview(account?.qris_image_url ?? null);
        setErr(null);
    }, [open, account]);

    function handleType(next: "bank" | "qris") {
        setType(next);
        if (next === "qris" && !bankName) setBankName("QRIS");
        setErr(null);
    }

    function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) { setErr("Logo maksimal 10MB."); return; }
        setLogo(file); setPresetLogo(null); setPreview(URL.createObjectURL(file)); setErr(null);
    }

    function handleQris(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) { setErr("Gambar QRIS maksimal 10MB."); return; }
        setQrisImage(file); setQrisPreview(URL.createObjectURL(file)); setErr(null);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErr(null);
        if (!bankName.trim()) { setErr("Nama/label wajib diisi."); return; }
        if (type === "bank" && (!accountNumber.trim() || !accountName.trim())) {
            setErr("No rekening & atas nama wajib diisi untuk tipe Bank."); return;
        }
        if (type === "qris" && !qrisImage && !qrisPreview) {
            setErr("Gambar QRIS wajib diunggah."); return;
        }
        setLoading(true);
        try {
            let logoFile = logo;
            if (type === "bank" && !logoFile && presetLogo) logoFile = await assetToFile(presetLogo);

            await saveBankAccount(
                {
                    type,
                    bank_name: bankName.trim(),
                    account_number: type === "bank" ? accountNumber.trim() : undefined,
                    account_name: type === "bank" ? accountName.trim() : (accountName.trim() || undefined),
                    initial_balance: initialBalance,
                    is_active: isActive,
                    logo: type === "bank" ? logoFile : undefined,
                    qris_image: type === "qris" ? qrisImage : undefined,
                },
                account?.id
            );
            onSaved();
        } catch (e2) {
            setErr(e2 instanceof Error ? e2.message : "Gagal menyimpan.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Modal open={open} onClose={loading ? () => { } : onClose} title={isEdit ? "Edit Rekening" : "Tambah Rekening"}>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {err && (
                    <div className="flex items-start gap-2 rounded-lg bg-error-container px-4 py-3 text-sm text-on-error-container">
                        <Icon name="error" className="text-[18px] mt-0.5" /> <span>{err}</span>
                    </div>
                )}

                {/* Pilih jenis */}
                <div>
                    <span className="text-sm font-medium text-on-surface">Jenis Channel</span>
                    <div className="mt-1.5 grid grid-cols-2 gap-2">
                        {(["bank", "qris"] as const).map((t) => (
                            <button key={t} type="button" onClick={() => handleType(t)}
                                className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${type === t ? "border-primary bg-primary/5 text-primary" : "border-outline-variant text-on-surface hover:bg-surface-container"
                                    }`}>
                                <Icon name={t === "bank" ? "account_balance" : "qr_code_2"} className="text-[18px]" />
                                {t === "bank" ? "Transfer Bank" : "QRIS Statis"}
                            </button>
                        ))}
                    </div>
                </div>

                {type === "bank" ? (
                    <>
                        {/* Nama bank + logo */}
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-lg border border-outline-variant bg-surface flex items-center justify-center overflow-hidden shrink-0">
                                {preview ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={preview} alt="logo" className="w-full h-full object-contain p-1" onError={() => setPreview(null)} />
                                ) : (
                                    <Icon name="account_balance" className="text-[26px] text-outline-variant" />
                                )}
                            </div>
                            <label className="flex-1 flex flex-col gap-1.5">
                                <span className="text-sm font-medium text-on-surface">Nama Bank <span className="text-error">*</span></span>
                                <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="mis. BCA / Bank Jateng Syariah"
                                    className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                            </label>
                        </div>

                        <label className="cursor-pointer inline-flex items-center gap-2 self-start rounded-lg border border-outline-variant px-3 py-2 text-sm text-on-surface hover:bg-surface-container transition-colors">
                            <Icon name="upload" className="text-[18px]" /> Upload logo bank (opsional)
                            <input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" onChange={handleLogo} className="hidden" />
                        </label>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className="flex flex-col gap-1.5">
                                <span className="text-sm font-medium text-on-surface">No Rekening <span className="text-error">*</span></span>
                                <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="1234567890"
                                    className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm font-mono text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                            </label>
                            <label className="flex flex-col gap-1.5">
                                <span className="text-sm font-medium text-on-surface">Atas Nama <span className="text-error">*</span></span>
                                <input type="text" value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Yayasan Khulafaur Rasyidin"
                                    className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                            </label>
                        </div>
                    </>
                ) : (
                    <>
                        {/* QRIS */}
                        <label className="flex flex-col gap-1.5">
                            <span className="text-sm font-medium text-on-surface">Label / Nama <span className="text-error">*</span></span>
                            <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="mis. QRIS Yayasan"
                                className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                        </label>
                        <label className="flex flex-col gap-1.5">
                            <span className="text-sm font-medium text-on-surface">Nama Merchant <span className="text-on-surface-variant font-normal text-xs">(opsional)</span></span>
                            <input type="text" value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Nama merchant di QRIS"
                                className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                        </label>
                        <div>
                            <span className="text-sm font-medium text-on-surface">Gambar QRIS <span className="text-error">*</span></span>
                            <div className="mt-1.5 flex items-center gap-4">
                                <div className="w-24 h-24 rounded-lg border border-outline-variant bg-surface flex items-center justify-center overflow-hidden shrink-0">
                                    {qrisPreview ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={qrisPreview} alt="QRIS" className="w-full h-full object-contain p-1" />
                                    ) : (
                                        <Icon name="qr_code_2" className="text-[32px] text-outline-variant" />
                                    )}
                                </div>
                                <label className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm text-on-surface hover:bg-surface-container transition-colors">
                                    <Icon name="upload" className="text-[18px]" /> Upload QR
                                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleQris} className="hidden" />
                                </label>
                            </div>
                        </div>
                    </>
                )}

                {/* Saldo awal */}
                <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-on-surface">Saldo Awal Rekening</span>
                    <input type="number" min={0} step="any" value={initialBalance || ""} onChange={(e) => setInitialBalance(Number(e.target.value))} placeholder="0"
                        className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                    {initialBalance > 0 && <span className="text-xs text-on-surface-variant">{formatRupiah(initialBalance)}</span>}
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)}
                        className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" />
                    <span className="text-sm text-on-surface">Aktif (tampil sebagai opsi donasi)</span>
                </label>

                <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={onClose} disabled={loading}
                        className="rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container disabled:opacity-50 transition-colors">Batal</button>
                    <button type="submit" disabled={loading}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container disabled:opacity-60 transition-colors">
                        {loading && <Icon name="progress_activity" className="text-[18px] animate-spin" />}
                        {loading ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Rekening"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}