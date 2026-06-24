"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { createDonationInput, getBankAccounts } from "@/services/donation";
import { useAdminAuth } from "@/stores/auth";
import { formatRupiah } from "@/lib/format";
import type { BankAccount, DonationInput } from "@/types";

const SALUTATIONS = ["Pak", "Bu", "Bang", "Kak", "Dek", "Ustadz", "Ustadzah", "Mas", "Mbak"];

export function DonationInputFormModal({ open, onClose, onSaved }: {
    open: boolean;
    onClose: () => void;
    onSaved: (created: DonationInput) => void;
}) {
    const user = useAdminAuth((s) => s.user);

    const [banks, setBanks] = useState<BankAccount[]>([]);
    const [salutation, setSalutation] = useState("");
    const [name, setName] = useState("");
    const [alias, setAlias] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [onBehalf, setOnBehalf] = useState("");
    const [message, setMessage] = useState("");
    const [amount, setAmount] = useState(0);
    const [bankId, setBankId] = useState<number | "">("");
    const [proof, setProof] = useState<File | null>(null);
    const [proofPreview, setProofPreview] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setSalutation(""); setName(""); setAlias(""); setPhone(""); setEmail(""); setOnBehalf(""); setMessage("");
        setAmount(0); setBankId(""); setProof(null); setProofPreview(null); setErr(null);
        getBankAccounts().then(setBanks).catch(() => setBanks([]));
    }, [open]);

    const selectedBank = banks.find((b) => b.id === bankId);

    function handleProof(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) { setErr("Ukuran file maksimal 10MB."); return; }
        setProof(file);
        setProofPreview(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
        setErr(null);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErr(null);
        if (!name.trim()) { setErr("Nama wakif wajib diisi."); return; }
        if (!phone.trim()) { setErr("No HP wakif wajib diisi."); return; }
        if (amount < 1000) { setErr("Nominal minimal Rp 1.000."); return; }
        setLoading(true);
        try {
            const created = await createDonationInput({
                donor_name: name.trim(),
                salutation: salutation || undefined,
                donor_alias: alias.trim() || undefined,
                donor_phone: phone.trim(),
                donor_email: email || undefined,
                amount,
                bank_account_id: bankId || undefined,
                on_behalf: onBehalf || undefined,
                message: message || undefined,
                proof,
            });
            onSaved(created);
        } catch (e2) {
            setErr(e2 instanceof Error ? e2.message : "Gagal menyimpan donasi.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Modal open={open} onClose={loading ? () => { } : onClose} title="Tambah Input Donasi" maxWidth="max-w-2xl">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {err && (
                    <div className="flex items-start gap-2 rounded-lg bg-error-container px-4 py-3 text-sm text-on-error-container">
                        <Icon name="error" className="text-[18px] mt-0.5" /> <span>{err}</span>
                    </div>
                )}

                <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-lg bg-surface-container-low px-4 py-3 text-sm">
                    <span className="text-on-surface-variant">No. Referensi: <span className="text-on-surface font-medium">otomatis</span></span>
                    <span className="text-on-surface-variant">Diinput oleh: <span className="text-on-surface font-medium">{user?.name ?? "—"}</span></span>
                    <span className="text-on-surface-variant">Status: <span className="text-tertiary-container font-medium">Pending</span></span>
                </div>

                {/* Sapaan + Nama */}
                <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-3">
                    <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium text-on-surface">Sapaan</span>
                        <select value={salutation} onChange={(e) => setSalutation(e.target.value)}
                            className="rounded-lg border border-outline-variant bg-surface px-3 py-2.5 text-sm text-on-surface focus:border-primary outline-none">
                            <option value="">—</option>
                            {SALUTATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </label>
                    <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium text-on-surface">Nama Wakif <span className="text-error">*</span></span>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama lengkap wakif"
                            className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                    </label>
                </div>

                <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-on-surface">Nama Panggilan <span className="text-on-surface-variant font-normal text-xs">(opsional)</span></span>
                    <input type="text" value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="mis. Pak Budi / Hamba Allah"
                        className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium text-on-surface">No HP <span className="text-error">*</span></span>
                        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xxxxxxxxxx"
                            className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                    </label>
                    <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium text-on-surface">Email <span className="text-on-surface-variant font-normal text-xs">(opsional)</span></span>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@contoh.com"
                            className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                    </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium text-on-surface">Nominal (Rp) <span className="text-error">*</span></span>
                        <input type="number" min={1000} step="any" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} placeholder="100000"
                            className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                        {amount >= 1000 && <span className="text-xs text-on-surface-variant">{formatRupiah(amount)}</span>}
                    </label>
                    <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium text-on-surface">Rekening Tujuan</span>
                        <select value={bankId} onChange={(e) => setBankId(e.target.value ? Number(e.target.value) : "")}
                            className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none">
                            <option value="">— Pilih rekening —</option>
                            {banks.map((b) => (
                                <option key={b.id} value={b.id}>{b.bank_name} — {b.account_name}</option>
                            ))}
                        </select>
                    </label>
                </div>

                {selectedBank && (
                    <div className="flex items-center gap-3 rounded-lg border border-outline-variant bg-surface px-4 py-3">
                        {selectedBank.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={selectedBank.logo_url} alt={selectedBank.bank_name} className="h-8 w-auto object-contain" />
                        ) : (
                            <Icon name="account_balance" className="text-[24px] text-primary" />
                        )}
                        <div className="text-sm">
                            <p className="font-semibold text-on-surface">{selectedBank.bank_name}</p>
                            <p className="text-on-surface-variant font-mono">{selectedBank.account_number} — {selectedBank.account_name}</p>
                        </div>
                    </div>
                )}

                <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-on-surface">Berwakaf Atas Nama <span className="text-on-surface-variant font-normal text-xs">(opsional)</span></span>
                    <input type="text" value={onBehalf} onChange={(e) => setOnBehalf(e.target.value)} placeholder="Jika diniatkan untuk orang lain"
                        className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                </label>
                <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-on-surface">Doa / Pesan <span className="text-on-surface-variant font-normal text-xs">(opsional)</span></span>
                    <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder="Doa atau pesan dari wakif..."
                        className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors resize-none" />
                </label>

                <div>
                    <span className="text-sm font-medium text-on-surface">Bukti Transfer <span className="text-on-surface-variant font-normal text-xs">(opsional)</span></span>
                    <div className="mt-1.5">
                        {proof ? (
                            <div className="flex items-center gap-3 rounded-lg border border-outline-variant bg-surface px-4 py-3">
                                {proofPreview ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={proofPreview} alt="bukti" className="w-12 h-12 rounded object-cover border border-outline-variant" />
                                ) : (
                                    <Icon name="picture_as_pdf" className="text-[28px] text-error" />
                                )}
                                <span className="text-sm text-on-surface flex-1 truncate">{proof.name}</span>
                                <button type="button" onClick={() => { setProof(null); setProofPreview(null); }}
                                    className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors">
                                    <Icon name="close" className="text-[18px]" />
                                </button>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-outline-variant py-6 cursor-pointer hover:bg-surface-container hover:border-primary transition-colors text-on-surface-variant">
                                <Icon name="cloud_upload" className="text-[28px]" />
                                <span className="text-sm">Klik untuk upload bukti transfer</span>
                                <span className="text-xs">JPG, PNG, WEBP, HEIC, atau PDF (maks 10MB)</span>
                                <input type="file" accept=".jpg,.jpeg,.png,.webp,.heic,.pdf" onChange={handleProof} className="hidden" />
                            </label>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={onClose} disabled={loading}
                        className="rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container disabled:opacity-50 transition-colors">Batal</button>
                    <button type="submit" disabled={loading}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container disabled:opacity-60 transition-colors">
                        {loading && <Icon name="progress_activity" className="text-[18px] animate-spin" />}
                        {loading ? "Menyimpan..." : "Simpan Donasi"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}