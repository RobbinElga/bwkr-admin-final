"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { createClaim, approveClaim, getDonationProof } from "@/services/claim";
import { useAdminAuth } from "@/stores/auth";
import { formatRupiah, formatDate } from "@/lib/format";
import type { DonationInput, Project } from "@/types";

export function ClaimFormModal({ open, donation, projects, onClose, onDone }: {
    open: boolean;
    donation: DonationInput | null;
    projects: Project[];
    onClose: () => void;
    onDone: () => void;
}) {
    const user = useAdminAuth((s) => s.user);
    const canApprove = user?.role === "super_admin" || user?.role === "admin";

    const [projectId, setProjectId] = useState<number | "">("");
    const [amount, setAmount] = useState(0);
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [proofLoading, setProofLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        if (!open || !donation) return;
        setProjectId(donation.project_id ?? "");
        setAmount(donation.amount);
        setNotes("");
        setErr(null);
    }, [open, donation]);

    async function viewProof() {
        if (!donation) return;
        setProofLoading(true);
        setErr(null);
        try {
            const url = await getDonationProof(donation.id);
            window.open(url, "_blank", "noopener,noreferrer");
        } catch {
            setErr("Gagal memuat bukti transfer.");
        } finally {
            setProofLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!donation) return;
        setErr(null);
        if (!projectId) { setErr("Pilih project tujuan dulu."); return; }
        if (amount < 1000) { setErr("Nominal alokasi minimal Rp 1.000."); return; }
        if (amount > donation.amount) { setErr("Nominal alokasi melebihi jumlah donasi."); return; }

        setLoading(true);
        try {
            const claim = await createClaim({
                donation_input_id: donation.id,
                project_id: Number(projectId),
                amount,
                notes: notes.trim() || undefined,
            });
            if (canApprove) {
                await approveClaim(claim.id);
            }
            onDone();
        } catch (e2) {
            setErr(e2 instanceof Error ? e2.message : "Gagal memproses klaim.");
        } finally {
            setLoading(false);
        }
    }

    if (!donation) return null;

    return (
        <Modal open={open} onClose={loading ? () => { } : onClose} title="Klaim & Salurkan Donasi" maxWidth="max-w-2xl">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {err && (
                    <div className="flex items-start gap-2 rounded-lg bg-error-container px-4 py-3 text-sm text-on-error-container">
                        <Icon name="error" className="text-[18px] mt-0.5" /> <span>{err}</span>
                    </div>
                )}

                {/* Ringkasan donasi */}
                <div className="rounded-xl border border-outline-variant bg-surface p-4">
                    <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3 mb-3">
                        <span className="text-xs uppercase tracking-wide text-on-surface-variant">Donasi Tersedia</span>
                        <span className="text-lg font-bold text-primary font-mono">{formatRupiah(donation.amount)}</span>
                    </div>
                    <dl className="grid grid-cols-2 gap-y-2 text-sm">
                        <dt className="text-on-surface-variant">No. Referensi</dt>
                        <dd className="text-right font-mono text-on-surface">{donation.ref_no}</dd>
                        <dt className="text-on-surface-variant">Nama Wakif</dt>
                        <dd className="text-right font-medium text-on-surface">{donation.donor_name}{donation.donor_alias ? ` (${donation.donor_alias})` : ""}</dd>
                        <dt className="text-on-surface-variant">Tanggal</dt>
                        <dd className="text-right text-on-surface">{formatDate(donation.created_at)}</dd>
                        <dt className="text-on-surface-variant">Rekening Tujuan</dt>
                        <dd className="text-right text-on-surface">{donation.bank_account?.bank_name ?? "—"}</dd>
                    </dl>
                    <button type="button" onClick={viewProof} disabled={!donation.has_proof || proofLoading}
                        className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 disabled:opacity-40 transition-colors">
                        {proofLoading ? <Icon name="progress_activity" className="text-[18px] animate-spin" /> : <Icon name="receipt_long" className="text-[18px]" />}
                        {donation.has_proof ? "Lihat Bukti Transfer" : "Tidak ada bukti transfer"}
                    </button>
                </div>

                {/* Form alokasi */}
                <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-on-surface">Pilih Project Tujuan <span className="text-error">*</span></span>
                    <select value={projectId} onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : "")}
                        className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none">
                        <option value="">— Pilih project (berjalan) —</option>
                        {projects.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} — sisa target {formatRupiah(p.shortfall)}</option>
                        ))}
                    </select>
                    {projects.length === 0 && <span className="text-xs text-error">Belum ada project berjalan. Buat/aktifkan project dulu.</span>}
                </label>

                <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-on-surface">Nominal Alokasi <span className="text-error">*</span></span>
                    <input type="number" min={1000} step="any" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))}
                        className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm font-mono text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                    <span className="text-xs text-on-surface-variant">
                        Default seluruh donasi ({formatRupiah(donation.amount)}). Ubah jika ingin alokasi parsial — sisanya bisa diklaim lagi.
                    </span>
                </label>

                <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-on-surface">Catatan <span className="text-on-surface-variant font-normal text-xs">(opsional)</span></span>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Keterangan internal alokasi dana..."
                        className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors resize-none" />
                </label>

                <div className="flex items-center gap-2 rounded-lg bg-primary/5 px-4 py-2.5 text-xs text-on-surface-variant">
                    <Icon name="info" className="text-[16px] text-primary" />
                    {canApprove
                        ? "Menyetujui akan menyalurkan dana ke project dan mengirim notifikasi WhatsApp ke wakif."
                        : "Klaim akan berstatus menunggu persetujuan admin/super admin."}
                </div>

                <div className="flex justify-end gap-3 pt-1">
                    <button type="button" onClick={onClose} disabled={loading}
                        className="rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container disabled:opacity-50 transition-colors">Batal</button>
                    <button type="submit" disabled={loading || projects.length === 0}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container disabled:opacity-60 transition-colors">
                        {loading ? <Icon name="progress_activity" className="text-[18px] animate-spin" /> : <Icon name={canApprove ? "check_circle" : "save"} className="text-[18px]" />}
                        {loading ? "Memproses..." : canApprove ? "Setujui & Salurkan" : "Simpan Klaim (Pending)"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}