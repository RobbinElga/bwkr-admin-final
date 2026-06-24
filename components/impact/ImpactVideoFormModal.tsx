"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { saveImpactVideo } from "@/services/impactVideo";
import type { ImpactVideo, Program, Project } from "@/types";

// Ambil ID video dari berbagai format URL YouTube (untuk preview thumbnail)
function parseYoutubeId(url: string): string | null {
    const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
    return m ? m[1] : null;
}

export function ImpactVideoFormModal({ open, item, programs, projects, onClose, onSaved }: {
    open: boolean;
    item: ImpactVideo | null;
    programs: Program[];
    projects: Project[];
    onClose: () => void;
    onSaved: () => void;
}) {
    const isEdit = Boolean(item);

    const [url, setUrl] = useState("");
    const [caption, setCaption] = useState("");
    const [programId, setProgramId] = useState<number | "">("");
    const [projectId, setProjectId] = useState<number | "">("");
    const [order, setOrder] = useState(0);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setUrl(item?.youtube_url ?? "");
        setCaption(item?.caption ?? "");
        setProgramId(item?.program_id ?? "");
        setProjectId(item?.project_id ?? "");
        setOrder(item?.order ?? 0);
        setErr(null);
    }, [open, item]);

    const ytId = parseYoutubeId(url);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErr(null);
        if (!url.trim()) { setErr("Link YouTube wajib diisi."); return; }
        if (!ytId) { setErr("Link YouTube tidak valid. Pakai format watch/embed/youtu.be."); return; }
        setLoading(true);
        try {
            await saveImpactVideo(
                {
                    youtube_url: url.trim(),
                    caption: caption.trim() || undefined,
                    program_id: programId || null,
                    project_id: projectId || null,
                    order,
                },
                item?.id
            );
            onSaved();
        } catch (e2) {
            setErr(e2 instanceof Error ? e2.message : "Gagal menyimpan video.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Modal open={open} onClose={loading ? () => { } : onClose} title={isEdit ? "Edit Video Dampak" : "Tambah Video Dampak"} maxWidth="max-w-xl">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {err && (
                    <div className="flex items-start gap-2 rounded-lg bg-error-container px-4 py-3 text-sm text-on-error-container">
                        <Icon name="error" className="text-[18px] mt-0.5" /> <span>{err}</span>
                    </div>
                )}

                <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-on-surface">Link YouTube <span className="text-error">*</span></span>
                    <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/watch?v=... atau https://youtu.be/..."
                        className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                    <span className="text-xs text-on-surface-variant">Mendukung format watch, embed, shorts, atau youtu.be.</span>
                </label>

                {/* Preview thumbnail */}
                {ytId && (
                    <div className="rounded-lg overflow-hidden border border-outline-variant aspect-video bg-surface-container-low relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`} alt="preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <Icon name="play_circle" filled className="text-white text-[44px]" />
                        </div>
                    </div>
                )}

                <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-on-surface">Judul / Caption <span className="text-on-surface-variant font-normal text-xs">(opsional)</span></span>
                    <input type="text" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="mis. Peresmian Sumur Wakaf Desa Makmur"
                        className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium text-on-surface">Relasi Program <span className="text-on-surface-variant font-normal text-xs">(opsional)</span></span>
                        <select value={programId} onChange={(e) => setProgramId(e.target.value ? Number(e.target.value) : "")}
                            className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none">
                            <option value="">— Tidak ada —</option>
                            {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </label>
                    <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium text-on-surface">Relasi Project <span className="text-on-surface-variant font-normal text-xs">(opsional)</span></span>
                        <select value={projectId} onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : "")}
                            className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none">
                            <option value="">— Tidak ada —</option>
                            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </label>
                </div>

                <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-on-surface">Urutan (slideshow)</span>
                    <input type="number" min={0} value={order} onChange={(e) => setOrder(Number(e.target.value))}
                        className="w-32 rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm font-mono text-on-surface focus:border-primary outline-none" />
                </label>

                <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={onClose} disabled={loading}
                        className="rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container disabled:opacity-50 transition-colors">Batal</button>
                    <button type="submit" disabled={loading}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container disabled:opacity-60 transition-colors">
                        {loading && <Icon name="progress_activity" className="text-[18px] animate-spin" />}
                        {loading ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Video"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}