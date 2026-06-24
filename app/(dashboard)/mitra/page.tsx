"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Partner } from "@/types";
import { getPartners, deletePartner, savePartner } from "@/services/partner";
import { useAdminAuth } from "@/stores/auth";
import { friendlyError } from "@/lib/errors";
import { Icon } from "@/components/ui/Icon";
import { PartnerFormModal } from "@/components/partner/PartnerFormModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type ViewState = "loading" | "ready" | "error";

export default function MitraPage() {
    const router = useRouter();
    const logout = useAdminAuth((s) => s.logout);

    const [state, setState] = useState<ViewState>("loading");
    const [items, setItems] = useState<Partner[]>([]);
    const [errMsg, setErrMsg] = useState("");
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Partner | null>(null);
    const [deleting, setDeleting] = useState<Partner | null>(null);
    const [delLoading, setDelLoading] = useState(false);
    const [togglingId, setTogglingId] = useState<number | null>(null);

    async function load() {
        setState("loading");
        try {
            setItems(await getPartners());
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
            await deletePartner(deleting.id);
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

    async function toggleVisible(p: Partner) {
        const next = !p.is_visible;
        setTogglingId(p.id);
        setItems((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_visible: next } : x))); // optimistic
        try {
            await savePartner(
                { name: p.name, type: p.type ?? undefined, pic_name: p.pic_name ?? undefined, pic_phone: p.pic_phone ?? undefined, pic_email: p.pic_email ?? undefined, is_visible: next },
                p.id
            );
        } catch (err) {
            setItems((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_visible: p.is_visible } : x))); // revert
            const code = err instanceof Error ? err.message : "SERVER";
            if (code === "UNAUTHORIZED") { await logout(); router.replace("/login"); return; }
            alert(friendlyError(code));
        } finally {
            setTogglingId(null);
        }
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-on-surface">Mitra</h2>
                    <p className="text-sm text-on-surface-variant mt-1">Logo mitra & kerja sama yang tampil di landing page.</p>
                </div>
                <button onClick={() => { setEditing(null); setFormOpen(true); }}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container transition-colors self-start sm:self-auto">
                    <Icon name="add" className="text-[18px]" /> Tambah Mitra
                </button>
            </div>

            {state === "loading" ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
                    {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-40 bg-surface-container rounded-xl" />)}
                </div>
            ) : state === "error" ? (
                <div className="flex flex-col items-center justify-center text-center py-20">
                    <div className="w-14 h-14 rounded-full bg-error-container flex items-center justify-center text-on-error-container mb-4"><Icon name="cloud_off" className="text-[28px]" /></div>
                    <h3 className="text-lg font-semibold text-on-surface">Gagal Memuat Data</h3>
                    <p className="text-sm text-on-surface-variant mt-1">{errMsg}</p>
                    <button onClick={load} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container transition-colors"><Icon name="refresh" className="text-[18px]" /> Coba Lagi</button>
                </div>
            ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-20 border border-dashed border-outline-variant rounded-xl">
                    <Icon name="handshake" className="text-[40px] text-outline-variant mb-3" />
                    <h3 className="text-base font-semibold text-on-surface">Belum Ada Mitra</h3>
                    <p className="text-sm text-on-surface-variant mt-1">Tambahkan mitra pertama Anda.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {items.map((p) => (
                        <div key={p.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)] flex flex-col group">
                            <div className="flex items-start justify-between mb-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${p.is_visible ? "bg-primary/10 text-primary" : "bg-surface-container-high text-on-surface-variant"}`}>
                                    {p.is_visible ? "Tampil" : "Disembunyikan"}
                                </span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setEditing(p); setFormOpen(true); }} className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"><Icon name="edit" className="text-[18px]" /></button>
                                    <button onClick={() => setDeleting(p)} className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors"><Icon name="delete" className="text-[18px]" /></button>
                                </div>
                            </div>
                            <div className="h-20 flex items-center justify-center mb-3">
                                {p.logo_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={p.logo_url} alt={p.name} className="max-h-full max-w-full object-contain" />
                                ) : (
                                    <Icon name="handshake" className="text-[36px] text-outline-variant" />
                                )}
                            </div>
                            <p className="text-sm font-semibold text-on-surface text-center line-clamp-1">{p.name}</p>
                            {p.type && <p className="text-xs text-on-surface-variant text-center">{p.type}</p>}
                            <button onClick={() => toggleVisible(p)} disabled={togglingId === p.id}
                                className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg border border-outline-variant py-1.5 text-xs font-medium text-on-surface hover:bg-surface-container disabled:opacity-50 transition-colors">
                                <Icon name={p.is_visible ? "visibility_off" : "visibility"} className="text-[16px]" />
                                {p.is_visible ? "Sembunyikan" : "Tampilkan"}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <PartnerFormModal open={formOpen} item={editing} onClose={() => setFormOpen(false)} onSaved={() => { setFormOpen(false); load(); }} />
            <ConfirmDialog
                open={!!deleting}
                title="Hapus Mitra"
                message={`Yakin ingin menghapus mitra "${deleting?.name}"?`}
                confirmLabel="Hapus"
                danger
                loading={delLoading}
                onConfirm={confirmDelete}
                onClose={() => setDeleting(null)}
            />
        </div>
    );
}