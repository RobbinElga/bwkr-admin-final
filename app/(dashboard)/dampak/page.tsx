"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ImpactVideo, Program, Project } from "@/types";
import { getImpactVideos, deleteImpactVideo, getProgramsForSelect } from "@/services/impactVideo";
import { getClaimProjects } from "@/services/claim";
import { useAdminAuth } from "@/stores/auth";
import { friendlyError } from "@/lib/errors";
import { Icon } from "@/components/ui/Icon";
import { ImpactVideoFormModal } from "@/components/impact/ImpactVideoFormModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type ViewState = "loading" | "ready" | "error";

export default function DampakPage() {
    const router = useRouter();
    const logout = useAdminAuth((s) => s.logout);

    const [state, setState] = useState<ViewState>("loading");
    const [items, setItems] = useState<ImpactVideo[]>([]);
    const [programs, setPrograms] = useState<Program[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [errMsg, setErrMsg] = useState("");
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<ImpactVideo | null>(null);
    const [deleting, setDeleting] = useState<ImpactVideo | null>(null);
    const [delLoading, setDelLoading] = useState(false);

    async function load() {
        setState("loading");
        try {
            const [vids, progs, projs] = await Promise.all([
                getImpactVideos(),
                programs.length ? Promise.resolve(programs) : getProgramsForSelect().catch(() => []),
                projects.length ? Promise.resolve(projects) : getClaimProjects().catch(() => []),
            ]);
            setItems(vids);
            if (!programs.length) setPrograms(progs);
            if (!projects.length) setProjects(projs);
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
            await deleteImpactVideo(deleting.id);
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

    const relName = (v: ImpactVideo) =>
        v.project_id ? projects.find((p) => p.id === v.project_id)?.name
            : v.program_id ? programs.find((p) => p.id === v.program_id)?.name
                : null;

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-on-surface">Dampak (Video)</h2>
                    <p className="text-sm text-on-surface-variant mt-1">Galeri video YouTube yang tampil di landing page.</p>
                </div>
                <button onClick={() => { setEditing(null); setFormOpen(true); }}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container transition-colors self-start sm:self-auto">
                    <Icon name="add" className="text-[18px]" /> Tambah Video
                </button>
            </div>

            {state === "loading" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
                    {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-56 bg-surface-container rounded-xl" />)}
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
                    <Icon name="smart_display" className="text-[40px] text-outline-variant mb-3" />
                    <h3 className="text-base font-semibold text-on-surface">Belum Ada Video</h3>
                    <p className="text-sm text-on-surface-variant mt-1">Tambahkan video dampak pertama Anda.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((v) => {
                        const rel = relName(v);
                        return (
                            <div key={v.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.04)] flex flex-col group">
                                <a href={v.youtube_url} target="_blank" rel="noopener noreferrer" className="relative aspect-video bg-surface-container-low block">
                                    {v.youtube_id ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={`https://i.ytimg.com/vi/${v.youtube_id}/hqdefault.jpg`} alt={v.caption ?? "video"} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center"><Icon name="smart_display" className="text-[40px] text-outline-variant" /></div>
                                    )}
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover:bg-black/10 transition-colors">
                                        <Icon name="play_circle" filled className="text-white text-[44px]" />
                                    </div>
                                    <span className="absolute top-2 right-2 bg-surface-container/90 text-on-surface px-2 py-0.5 rounded text-xs font-medium">Urutan: {v.order}</span>
                                </a>
                                <div className="p-4 flex-1 flex flex-col">
                                    <h3 className="text-sm font-semibold text-on-surface line-clamp-1">{v.caption ?? "Tanpa judul"}</h3>
                                    {rel && (
                                        <p className="text-xs text-on-surface-variant mt-1 flex items-center gap-1">
                                            <Icon name={v.project_id ? "account_tree" : "campaign"} className="text-[14px] text-primary" /> {rel}
                                        </p>
                                    )}
                                    <div className="mt-auto pt-3 flex justify-end gap-1">
                                        <button onClick={() => { setEditing(v); setFormOpen(true); }} className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"><Icon name="edit" className="text-[18px]" /></button>
                                        <button onClick={() => setDeleting(v)} className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors"><Icon name="delete" className="text-[18px]" /></button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <ImpactVideoFormModal open={formOpen} item={editing} programs={programs} projects={projects} onClose={() => setFormOpen(false)} onSaved={() => { setFormOpen(false); load(); }} />
            <ConfirmDialog
                open={!!deleting}
                title="Hapus Video"
                message={`Yakin ingin menghapus video "${deleting?.caption ?? "ini"}"?`}
                confirmLabel="Hapus"
                danger
                loading={delLoading}
                onConfirm={confirmDelete}
                onClose={() => setDeleting(null)}
            />
        </div>
    );
}