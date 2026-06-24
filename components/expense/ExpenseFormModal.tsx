"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { createExpense, getExpenseProjects } from "@/services/expense";
import { getAdminBankAccounts } from "@/services/bank";
import { formatRupiah } from "@/lib/format";
import type { Project, BankAccount } from "@/types";

const MATERAI_THRESHOLD = 5_000_000;

export function ExpenseFormModal({ open, onClose, onSaved }: {
    open: boolean;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [banks, setBanks] = useState<BankAccount[]>([]);

    const [projectId, setProjectId] = useState<number | "">("");
    const [amount, setAmount] = useState(0);
    const [bankId, setBankId] = useState<number | "">("");
    const [notes, setNotes] = useState("");
    const [receipt, setReceipt] = useState<File | null>(null);
    const [ttd, setTtd] = useState<File | null>(null);
    const [materai, setMaterai] = useState<File | null>(null);

    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setProjectId(""); setAmount(0); setBankId(""); setNotes("");
        setReceipt(null); setTtd(null); setMaterai(null); setErr(null);
        getExpenseProjects().then(setProjects).catch(() => setProjects([]));
        getAdminBankAccounts().then(setBanks).catch(() => setBanks([]));
    }, [open]);

    const selectedProject = projects.find((p) => p.id === projectId) ?? null;
    const needsMaterai = amount > MATERAI_THRESHOLD;

    function pickFile(setter: (f: File | null) => void) {
        return (e: React.ChangeEvent<HTMLInputElement>) => {
            const f = e.target.files?.[0] ?? null;
            if (f && f.size > 10 * 1024 * 1024) { setErr("Ukuran file maksimal 10MB."); return; }
            setter(f); setErr(null);
        };
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErr(null);
        if (!projectId) { setErr("Pilih project tujuan dulu."); return; }
        if (amount < 1) { setErr("Nominal pengeluaran wajib diisi."); return; }
        if (!notes.trim()) { setErr("Catatan/keterangan wajib diisi."); return; }
        if (!receipt) { setErr("Bukti pengeluaran (kuitansi/invoice) wajib diunggah."); return; }
        if (needsMaterai && !materai) { setErr("Pengeluaran di atas Rp 5.000.000 wajib melampirkan materai."); return; }

        setLoading(true);
        try {
            await createExpense({
                project_id: Number(projectId),
                amount,
                bank_account_id: bankId || undefined,
                notes: notes.trim(),
                receipt_file: receipt,
                ttd_file: ttd,
                materai_file: materai,
            });
            onSaved();
        } catch (e2) {
            setErr(e2 instanceof Error ? e2.message : "Gagal menyimpan pengeluaran.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Modal open={open} onClose={loading ? () => { } : onClose} title="Catat Pengeluaran Baru" maxWidth="max-w-2xl">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {err && (
                    <div className="flex items-start gap-2 rounded-lg bg-error-container px-4 py-3 text-sm text-on-error-container">
                        <Icon name="error" className="text-[18px] mt-0.5" /> <span>{err}</span>
                    </div>
                )}

                <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-on-surface">Pilih Project <span className="text-error">*</span></span>
                    <select value={projectId} onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : "")}
                        className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none">
                        <option value="">— Pilih project —</option>
                        {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </label>

                {/* Ringkasan dana project */}
                {selectedProject && (
                    <div className="grid grid-cols-3 gap-3 rounded-lg bg-surface-container-low p-3 text-center">
                        <div>
                            <p className="text-xs text-on-surface-variant">Dana Masuk</p>
                            <p className="text-sm font-mono font-semibold text-primary">{formatRupiah(selectedProject.amount_raised)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-on-surface-variant">Terpakai</p>
                            <p className="text-sm font-mono text-on-surface">{formatRupiah(selectedProject.amount_spent)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-on-surface-variant">Sisa Saldo</p>
                            <p className="text-sm font-mono font-bold text-primary-container">{formatRupiah(selectedProject.remaining_funds)}</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium text-on-surface">Nominal Pengeluaran <span className="text-error">*</span></span>
                        <input type="number" min={1} step="any" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} placeholder="0"
                            className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm font-mono text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                        {amount > 0 && <span className="text-xs text-on-surface-variant">{formatRupiah(amount)}</span>}
                    </label>
                    <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium text-on-surface">Rekening Sumber <span className="text-on-surface-variant font-normal text-xs">(opsional)</span></span>
                        <select value={bankId} onChange={(e) => setBankId(e.target.value ? Number(e.target.value) : "")}
                            className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none">
                            <option value="">— Pilih rekening —</option>
                            {banks.map((b) => <option key={b.id} value={b.id}>{b.bank_name}{b.account_number ? ` — ${b.account_number}` : ""}</option>)}
                        </select>
                    </label>
                </div>

                <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-on-surface">Catatan / Keterangan <span className="text-error">*</span></span>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Deskripsikan tujuan penggunaan dana..."
                        className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors resize-none" />
                </label>

                {/* Lampiran */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <FilePick label="Bukti / Kuitansi" required file={receipt} onChange={pickFile(setReceipt)} />
                    <FilePick label="TTD (opsional)" file={ttd} onChange={pickFile(setTtd)} />
                    <FilePick label={`Materai${needsMaterai ? " *" : ""}`} file={materai} onChange={pickFile(setMaterai)} highlight={needsMaterai} />
                </div>

                {needsMaterai && (
                    <div className="flex items-center gap-2 rounded-lg bg-tertiary-container/10 px-4 py-2.5 text-xs text-tertiary-container">
                        <Icon name="warning" className="text-[16px]" />
                        Pengeluaran di atas {formatRupiah(MATERAI_THRESHOLD)} wajib melampirkan materai.
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-1">
                    <button type="button" onClick={onClose} disabled={loading}
                        className="rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container disabled:opacity-50 transition-colors">Batal</button>
                    <button type="submit" disabled={loading}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container disabled:opacity-60 transition-colors">
                        {loading && <Icon name="progress_activity" className="text-[18px] animate-spin" />}
                        {loading ? "Menyimpan..." : "Simpan Pengeluaran"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function FilePick({ label, file, onChange, required, highlight }: {
    label: string; file: File | null; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; required?: boolean; highlight?: boolean;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-on-surface">{label}{required && <span className="text-error"> *</span>}</span>
            <label className={`flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed py-4 cursor-pointer transition-colors ${highlight && !file ? "border-tertiary-container/50 bg-tertiary-container/5" : "border-outline-variant hover:bg-surface-container"
                }`}>
                <Icon name={file ? "check_circle" : "upload_file"} className={`text-[22px] ${file ? "text-primary" : "text-on-surface-variant"}`} />
                <span className="text-xs text-on-surface-variant truncate max-w-[90%] px-1">{file ? file.name : "Pilih file"}</span>
                <input type="file" accept=".jpg,.jpeg,.png,.webp,.heic,.pdf" onChange={onChange} className="hidden" />
            </label>
        </div>
    );
}