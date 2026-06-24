"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { SettingGroup } from "@/types";
import { getSettings, saveSettings } from "@/services/settings";
import { useAdminAuth } from "@/stores/auth";
import { friendlyError } from "@/lib/errors";
import { Icon } from "@/components/ui/Icon";

type ViewState = "loading" | "ready" | "error";

export default function PengaturanPage() {
    const router = useRouter();
    const logout = useAdminAuth((s) => s.logout);

    const [state, setState] = useState<ViewState>("loading");
    const [groups, setGroups] = useState<SettingGroup[]>([]);
    const [values, setValues] = useState<Record<string, string>>({});
    const [files, setFiles] = useState<Record<string, File>>({});
    const [previews, setPreviews] = useState<Record<string, string | null>>({});
    const [errMsg, setErrMsg] = useState("");
    const [saving, setSaving] = useState(false);
    const [savedAt, setSavedAt] = useState<string | null>(null);

    async function load() {
        setState("loading");
        try {
            const g = await getSettings();
            const v: Record<string, string> = {};
            const p: Record<string, string | null> = {};
            g.forEach((grp) => grp.fields.forEach((f) => {
                if (f.type === "image") p[f.key] = f.url ?? null;
                else v[f.key] = f.value ?? "";
            }));
            setGroups(g); setValues(v); setPreviews(p); setFiles({});
            setState("ready");
        } catch (err) {
            const code = err instanceof Error ? err.message : "SERVER";
            if (code === "UNAUTHORIZED") { await logout(); router.replace("/login"); return; }
            setErrMsg(friendlyError(code)); setState("error");
        }
    }
    useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    function pickImage(key: string, file?: File) {
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { alert("Gambar maksimal 5MB."); return; }
        setFiles((p) => ({ ...p, [key]: file }));
        setPreviews((p) => ({ ...p, [key]: URL.createObjectURL(file) }));
    }

    async function save() {
        setSaving(true);
        try {
            const fd = new FormData();
            Object.entries(values).forEach(([k, v]) => fd.set(k, v ?? ""));
            Object.entries(files).forEach(([k, f]) => fd.set(k, f));
            await saveSettings(fd);
            setSavedAt(new Date().toLocaleTimeString("id-ID"));
            load();
        } catch (err) {
            const code = err instanceof Error ? err.message : "SERVER";
            if (code === "UNAUTHORIZED") { await logout(); router.replace("/login"); return; }
            alert(friendlyError(code));
        } finally {
            setSaving(false);
        }
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-on-surface">Pengaturan Situs</h2>
                    <p className="text-sm text-on-surface-variant mt-1">Kelola konten landing page: hero, identitas, kontak, dan halaman tentang.</p>
                </div>
                <div className="flex items-center gap-3 self-start sm:self-auto">
                    {savedAt && <span className="text-xs text-on-surface-variant">Tersimpan {savedAt}</span>}
                    <button onClick={save} disabled={saving || state !== "ready"}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container disabled:opacity-60 transition-colors">
                        {saving ? <Icon name="progress_activity" className="text-[18px] animate-spin" /> : <Icon name="save" className="text-[18px]" />}
                        {saving ? "Menyimpan..." : "Simpan Perubahan"}
                    </button>
                </div>
            </div>

            {state === "loading" ? (
                <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 bg-surface-container rounded-xl animate-pulse" />)}
                </div>
            ) : state === "error" ? (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col items-center justify-center text-center py-16">
                    <Icon name="cloud_off" className="text-[40px] text-error mb-3" />
                    <p className="text-sm text-on-surface-variant">{errMsg}</p>
                    <button onClick={load} className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary">Coba Lagi</button>
                </div>
            ) : (
                <div className="space-y-6">
                    {groups.map((grp) => (
                        <div key={grp.key} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
                            <h3 className="text-base font-semibold text-on-surface mb-4">{grp.label}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {grp.fields.map((f) => (
                                    <div key={f.key} className={f.type === "textarea" ? "md:col-span-2" : ""}>
                                        <label className="block text-sm font-medium text-on-surface mb-1.5">{f.label}</label>

                                        {f.type === "image" ? (
                                            <div className="flex items-center gap-3">
                                                <div className="w-20 h-20 rounded-lg border border-outline-variant bg-surface overflow-hidden flex items-center justify-center shrink-0">
                                                    {previews[f.key] ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={previews[f.key]!} alt={f.label} className="w-full h-full object-contain" />
                                                    ) : (
                                                        <Icon name="image" className="text-[24px] text-outline-variant" />
                                                    )}
                                                </div>
                                                <label className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 text-sm text-on-surface hover:bg-surface-container transition-colors">
                                                    <Icon name="upload" className="text-[18px]" /> Unggah
                                                    <input type="file" accept="image/*" className="hidden"
                                                        onChange={(e) => pickImage(f.key, e.target.files?.[0])} />
                                                </label>
                                            </div>
                                        ) : f.type === "textarea" ? (
                                            <textarea rows={3} value={values[f.key] ?? ""} onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.value }))}
                                                className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary outline-none resize-none" />
                                        ) : (
                                            <input type="text" value={values[f.key] ?? ""} onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.value }))}
                                                className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary outline-none" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}