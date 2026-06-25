"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { getWhatsappSettings, saveWhatsappSettings } from "@/services/settings";

export function WhatsappSettingsCard() {
    const [enabled, setEnabled] = useState(true);
    const [keySet, setKeySet] = useState(false);
    const [token, setToken] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);

    async function load() {
        setLoading(true);
        try {
            const s = await getWhatsappSettings();
            setEnabled(s.wa_enabled);
            setKeySet(s.wa_api_key_set);
        } catch { /* abaikan */ }
        finally { setLoading(false); }
    }
    useEffect(() => { load(); }, []);

    async function save() {
        setSaving(true);
        setMsg(null);
        try {
            await saveWhatsappSettings({
                wa_enabled: enabled,
                ...(token.trim() ? { wa_api_key: token.trim() } : {}),
            });
            setToken("");
            setMsg("Tersimpan.");
            load();
        } catch {
            setMsg("Gagal menyimpan.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
            <h3 className="text-base font-semibold text-on-surface mb-1 flex items-center gap-2">
                <Icon name="key" className="text-[20px] text-primary" /> Pengaturan WhatsApp API (Fonnte)
            </h3>
            <p className="text-sm text-on-surface-variant mb-4">Token disimpan aman di server & tidak ditampilkan kembali.</p>

            {loading ? (
                <div className="h-24 rounded-lg bg-surface-container-low animate-pulse" />
            ) : (
                <div className="flex flex-col gap-4 max-w-lg">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)}
                            className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" />
                        <span className="text-sm text-on-surface">Aktifkan pengiriman WhatsApp</span>
                    </label>

                    <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium text-on-surface">
                            Token Fonnte{" "}
                            {keySet && <span className="text-xs text-primary font-normal">(sudah terpasang — kosongkan bila tak ingin mengubah)</span>}
                        </span>
                        <input type="password" value={token} onChange={(e) => setToken(e.target.value)}
                            placeholder={keySet ? "•••••••• (token tersimpan)" : "Tempel token Fonnte di sini"}
                            className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                    </label>

                    <div className="flex items-center gap-3">
                        <button onClick={save} disabled={saving}
                            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container disabled:opacity-60 transition-colors">
                            {saving ? <Icon name="progress_activity" className="text-[18px] animate-spin" /> : <Icon name="save" className="text-[18px]" />}
                            {saving ? "Menyimpan..." : "Simpan"}
                        </button>
                        {msg && <span className="text-sm text-on-surface-variant">{msg}</span>}
                    </div>
                </div>
            )}
        </div>
    );
}