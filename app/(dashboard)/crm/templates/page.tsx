"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { BroadcastTemplate } from "@/types";
import { getTemplates, saveTemplate, deleteTemplate } from "@/services/crm";
import { useAdminAuth } from "@/stores/auth";
import { friendlyError } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type ViewState = "loading" | "ready" | "error";
const VARIABLES = ["[Nama]", "[Nominal]", "[Project]"];

export default function TemplatesPage() {
    const router = useRouter();
    const logout = useAdminAuth((s) => s.logout);

    const [state, setState] = useState<ViewState>("loading");
    const [items, setItems] = useState<BroadcastTemplate[]>([]);
    const [errMsg, setErrMsg] = useState("");

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<BroadcastTemplate | null>(null);
    const [deleting, setDeleting] = useState<BroadcastTemplate | null>(null);
    const [delLoading, setDelLoading] = useState(false);

    async function load() {
        setState("loading");
        try {
            setItems(await getTemplates());
            setState("ready");
        } catch (err) {
            const code = err instanceof Error ? err.message : "SERVER";
            if (code === "UNAUTHORIZED") { await logout(); router.replace("/login"); return; }
            setErrMsg(friendlyError(code));
            setState("error");
        }
    }
    useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    async function confirmDelete() {
        if (!deleting) return;
        setDelLoading(true);
        try {
            await deleteTemplate(deleting.id);
            setDeleting(null);
            load();
        } catch (err) {
            const code = err instanceof Error ? err.message : "SERVER";
            if (code === "UNAUTHORIZED") { await logout(); router.replace("/login"); return; }
            alert(friendlyError(code));
        } finally {
            setDelLoading(false);
        }
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <button onClick={() => router.push("/crm/broadcast")} className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary transition-colors mb-2">
                        <Icon name="arrow_back" className="text-[18px]" /> Kembali ke Broadcast
                    </button>
                    <h2 className="text-2xl font-bold text-on-surface">Template Pesan</h2>
                    <p className="text-sm text-on-surface-variant mt-1">Simpan pesan yang sering dipakai untuk broadcast.</p>
                </div>
                <button onClick={() => { setEditing(null); setFormOpen(true); }}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container transition-colors self-start sm:self-auto">
                    <Icon name="add" className="text-[18px]" /> Tambah Template
                </button>
            </div>

            {state === "loading" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
                    {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-40 bg-surface-container rounded-xl" />)}
                </div>
            ) : state === "error" ? (
                <div className="flex flex-col items-center justify-center text-center py-16 border border-outline-variant rounded-xl bg-surface-container-lowest">
                    <div className="w-14 h-14 rounded-full bg-error-container flex items-center justify-center text-on-error-container mb-4"><Icon name="cloud_off" className="text-[28px]" /></div>
                    <h3 className="text-lg font-semibold text-on-surface">Gagal Memuat Data</h3>
                    <p className="text-sm text-on-surface-variant mt-1">{errMsg}</p>
                    <button onClick={load} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container transition-colors"><Icon name="refresh" className="text-[18px]" /> Coba Lagi</button>
                </div>
            ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-16 border border-dashed border-outline-variant rounded-xl">
                    <Icon name="description" className="text-[40px] text-outline-variant mb-3" />
                    <h3 className="text-base font-semibold text-on-surface">Belum Ada Template</h3>
                    <p className="text-sm text-on-surface-variant mt-1">Buat template pesan pertama Anda.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {items.map((t) => (
                        <div key={t.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)] flex flex-col group">
                            <div className="flex items-start justify-between mb-2">
                                <h3 className="text-sm font-semibold text-on-surface line-clamp-1">{t.name}</h3>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setEditing(t); setFormOpen(true); }} className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"><Icon name="edit" className="text-[18px]" /></button>
                                    <button onClick={() => setDeleting(t)} className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors"><Icon name="delete" className="text-[18px]" /></button>
                                </div>
                            </div>
                            <p className="text-sm text-on-surface-variant whitespace-pre-wrap line-clamp-4 flex-1">{t.content}</p>
                            <p className="text-xs text-on-surface-variant mt-3 pt-3 border-t border-outline-variant/60">Dibuat {formatDate(t.created_at)}</p>
                        </div>
                    ))}
                </div>
            )}

            <TemplateFormModal
                open={formOpen}
                item={editing}
                onClose={() => setFormOpen(false)}
                onSaved={() => { setFormOpen(false); load(); }}
                onAuthFail={async () => { await logout(); router.replace("/login"); }}
            />
            <ConfirmDialog
                open={!!deleting}
                title="Hapus Template"
                message={`Yakin ingin menghapus template "${deleting?.name}"?`}
                confirmLabel="Hapus"
                danger
                loading={delLoading}
                onConfirm={confirmDelete}
                onClose={() => setDeleting(null)}
            />
        </div>
    );
}

function TemplateFormModal({ open, item, onClose, onSaved, onAuthFail }: {
    open: boolean;
    item: BroadcastTemplate | null;
    onClose: () => void;
    onSaved: () => void;
    onAuthFail: () => void;
}) {
    const isEdit = Boolean(item);
    const [name, setName] = useState("");
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (!open) return;
        setName(item?.name ?? "");
        setContent(item?.content ?? "");
        setErr(null);
    }, [open, item]);

    function insertVar(v: string) {
        const ta = textareaRef.current;
        if (!ta) { setContent((c) => c + v); return; }
        const start = ta.selectionStart, end = ta.selectionEnd;
        const next = content.slice(0, start) + v + content.slice(end);
        setContent(next);
        requestAnimationFrame(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = start + v.length; });
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErr(null);
        if (!name.trim()) { setErr("Nama template wajib diisi."); return; }
        if (!content.trim()) { setErr("Isi template wajib diisi."); return; }
        setLoading(true);
        try {
            await saveTemplate({ name: name.trim(), content: content.trim() }, item?.id);
            onSaved();
        } catch (e2) {
            const code = e2 instanceof Error ? e2.message : "SERVER";
            if (code === "UNAUTHORIZED") { onAuthFail(); return; }
            setErr(e2 instanceof Error ? e2.message : "Gagal menyimpan template.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Modal open={open} onClose={loading ? () => { } : onClose} title={isEdit ? "Edit Template" : "Tambah Template"} maxWidth="max-w-xl">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {err && (
                    <div className="flex items-start gap-2 rounded-lg bg-error-container px-4 py-3 text-sm text-on-error-container">
                        <Icon name="error" className="text-[18px] mt-0.5" /> <span>{err}</span>
                    </div>
                )}

                <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-on-surface">Nama Template <span className="text-error">*</span></span>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Ucapan Terima Kasih"
                        className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                </label>

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-on-surface">Isi Pesan <span className="text-error">*</span></span>
                        <div className="flex gap-1">
                            {VARIABLES.map((v) => (
                                <button key={v} type="button" onClick={() => insertVar(v)}
                                    className="px-2 py-1 text-xs font-mono rounded border border-outline-variant text-primary hover:bg-primary/5 transition-colors">
                                    {v}
                                </button>
                            ))}
                        </div>
                    </div>
                    <textarea ref={textareaRef} value={content} onChange={(e) => setContent(e.target.value)} rows={8}
                        placeholder="Tulis isi template... gunakan [Nama], [Nominal], [Project] untuk personalisasi."
                        className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors resize-y leading-relaxed" />
                    <p className="text-xs text-on-surface-variant mt-1">Variabel akan diganti otomatis per donatur saat broadcast.</p>
                </div>

                <div className="flex justify-end gap-3 pt-1">
                    <button type="button" onClick={onClose} disabled={loading}
                        className="rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container disabled:opacity-50 transition-colors">Batal</button>
                    <button type="submit" disabled={loading}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container disabled:opacity-60 transition-colors">
                        {loading && <Icon name="progress_activity" className="text-[18px] animate-spin" />}
                        {loading ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Template"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}