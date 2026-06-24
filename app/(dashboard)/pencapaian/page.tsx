"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Achievement } from "@/types";
import { getAchievements, deleteAchievement } from "@/services/achievement";
import { useAdminAuth } from "@/stores/auth";
import { friendlyError } from "@/lib/errors";
import { Icon } from "@/components/ui/Icon";
import { AchievementFormModal } from "@/components/achievement/AchievementFormModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type ViewState = "loading" | "ready" | "error";

export default function PencapaianPage() {
    const router = useRouter();
    const logout = useAdminAuth((s) => s.logout);

    const [state, setState] = useState<ViewState>("loading");
    const [items, setItems] = useState<Achievement[]>([]);
    const [errMsg, setErrMsg] = useState("");
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Achievement | null>(null);
    const [deleting, setDeleting] = useState<Achievement | null>(null);
    const [delLoading, setDelLoading] = useState(false);

    async function load() {
        setState("loading");
        try {
            setItems(await getAchievements());
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
            await deleteAchievement(deleting.id);
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
                    <h2 className="text-2xl font-bold text-on-surface">Pencapaian</h2>
                    <p className="text-sm text-on-surface-variant mt-1">Metrik & milestone yang tampil di landing page.</p>
                </div>
                <button onClick={() => { setEditing(null); setFormOpen(true); }}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container transition-colors self-start sm:self-auto">
                    <Icon name="add" className="text-[18px]" /> Tambah Pencapaian
                </button>
            </div>

            {state === "loading" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
                    {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-36 bg-surface-container rounded-xl" />)}
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
                    <Icon name="emoji_events" className="text-[40px] text-outline-variant mb-3" />
                    <h3 className="text-base font-semibold text-on-surface">Belum Ada Pencapaian</h3>
                    <p className="text-sm text-on-surface-variant mt-1">Tambahkan metrik pencapaian pertama Anda.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((a) => (
                        <div key={a.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)] relative overflow-hidden group">
                            <div className="flex items-start justify-between mb-3">
                                <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-primary overflow-hidden">
                                    {a.image_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={a.image_url} alt={a.label} className="w-full h-full object-contain p-1" />
                                    ) : (
                                        <Icon name="emoji_events" className="text-[24px]" />
                                    )}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setEditing(a); setFormOpen(true); }} className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"><Icon name="edit" className="text-[18px]" /></button>
                                    <button onClick={() => setDeleting(a)} className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors"><Icon name="delete" className="text-[18px]" /></button>
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-primary font-mono">{a.count.toLocaleString("id-ID")}</p>
                            <p className="text-sm font-medium text-on-surface mt-1">{a.label}</p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-on-surface-variant">
                                {a.period && <span className="px-2 py-0.5 bg-surface-container-high rounded">{a.period}</span>}
                                <span>Urutan: {a.order}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <AchievementFormModal open={formOpen} item={editing} onClose={() => setFormOpen(false)} onSaved={() => { setFormOpen(false); load(); }} />
            <ConfirmDialog
                open={!!deleting}
                title="Hapus Pencapaian"
                message={`Yakin ingin menghapus "${deleting?.label}"?`}
                confirmLabel="Hapus"
                danger
                loading={delLoading}
                onConfirm={confirmDelete}
                onClose={() => setDeleting(null)}
            />
        </div>
    );
}