"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { BroadcastTemplate, DonorTier } from "@/types";
import { getTemplates, sendBroadcast } from "@/services/crm";
import { friendlyError } from "@/lib/errors";
import { Icon } from "@/components/ui/Icon";
import Link from "next/link";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAdminAuth } from "@/stores/auth";
import { WhatsappSettingsCard } from "@/components/crm/WhatsappSettingsCard";

const VARIABLES = ["[Nama]", "[Nominal]", "[Project]"];

const TARGETS: { value: DonorTier | ""; label: string; desc: string }[] = [
    { value: "", label: "Semua Donatur", desc: "Kirim ke seluruh database donatur." },
    { value: "premium", label: "Donatur Premium", desc: "Hanya donatur tier premium." },
    { value: "reguler", label: "Donatur Reguler", desc: "Hanya donatur tier reguler." },
];

export default function BroadcastPage() {
    const router = useRouter();
    const logout = useAdminAuth((s) => s.logout);
    const role = useAdminAuth((s) => s.user?.role);
    const isAdmin = role === "super_admin" || role === "admin";

    const [templates, setTemplates] = useState<BroadcastTemplate[]>([]);
    const [title, setTitle] = useState("");
    const [templateId, setTemplateId] = useState<number | "">("");
    const [message, setMessage] = useState(
        "Assalamu'alaikum [Nama],\n\nTerima kasih atas partisipasi Anda dalam program wakaf. Semoga menjadi amal jariyah yang terus mengalir."
    );
    const [tier, setTier] = useState<DonorTier | "">("");

    const [sending, setSending] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [result, setResult] = useState<{ sent: number } | null>(null);

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        getTemplates().then(setTemplates).catch(() => setTemplates([]));
    }, []);

    function applyTemplate(id: number | "") {
        setTemplateId(id);
        if (id) {
            const t = templates.find((x) => x.id === id);
            if (t) setMessage(t.content);
        }
    }

    // sisipkan variabel di posisi kursor
    function insertVar(v: string) {
        const ta = textareaRef.current;
        if (!ta) { setMessage((m) => m + v); return; }
        const start = ta.selectionStart, end = ta.selectionEnd;
        const next = message.slice(0, start) + v + message.slice(end);
        setMessage(next);
        requestAnimationFrame(() => {
            ta.focus();
            ta.selectionStart = ta.selectionEnd = start + v.length;
        });
    }

    const preview = useMemo(
        () => message
            .replace(/\[Nama\]/g, "Budi Santoso")
            .replace(/\[Nominal\]/g, "Rp1.500.000")
            .replace(/\[Project\]/g, "Wakaf Sumur Bor"),
        [message]
    );

    function validateThenConfirm() {
        setErr(null);
        if (!title.trim()) { setErr("Judul broadcast wajib diisi."); return; }
        if (!templateId && !message.trim()) { setErr("Tulis pesan atau pilih template dulu."); return; }
        setConfirmOpen(true);
    }

    async function doSend() {
        setSending(true);
        setErr(null);
        try {
            const res = await sendBroadcast({
                title: title.trim(),
                template_id: templateId || undefined,
                message: templateId ? undefined : message.trim(),
                tier: tier || undefined,
            });
            setResult({ sent: res.sent });
            setConfirmOpen(false);
        } catch (e) {
            const code = e instanceof Error ? e.message : "SERVER";
            if (code === "UNAUTHORIZED") { await logout(); router.replace("/login"); return; }
            setErr(["NETWORK", "SERVER", "VALIDATION", "UNAUTHORIZED"].includes(code) ? friendlyError(code) : (e instanceof Error ? e.message : "Gagal mengirim."));
            setConfirmOpen(false);
        } finally {
            setSending(false);
        }
    }

    const targetLabel = TARGETS.find((t) => t.value === tier)?.label ?? "Semua Donatur";

    if (result) {
        return (
            <div className="flex flex-col items-center justify-center text-center py-20">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4"><Icon name="send" className="text-[32px]" /></div>
                <h3 className="text-lg font-semibold text-on-surface">Broadcast Diproses</h3>
                <p className="text-sm text-on-surface-variant mt-1">{result.sent} pesan WhatsApp sedang dikirim ke penerima.</p>
                <div className="flex gap-3 mt-6">
                    <button onClick={() => setResult(null)} className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container transition-colors">
                        <Icon name="add" className="text-[18px]" /> Buat Broadcast Lagi
                    </button>
                    <Link href="/crm/donors" className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container transition-colors">
                        <Icon name="groups" className="text-[18px]" /> Ke Daftar Donatur
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-on-surface">Broadcast WhatsApp</h2>
                    <p className="text-sm text-on-surface-variant mt-1">Kirim pesan massal ke donatur via WhatsApp.</p>
                </div>
                <a href="/crm/templates"
                    className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container transition-colors self-start sm:self-auto">
                    <Icon name="description" className="text-[18px]" /> Kelola Template
                </a>
            </div>

            {isAdmin && (
                <div className="mb-6">
                    <WhatsappSettingsCard />
                </div>
            )}

            {err && (
                <div className="flex items-start gap-2 rounded-lg bg-error-container px-4 py-3 text-sm text-on-error-container mb-4">
                    <Icon name="error" className="text-[18px] mt-0.5" /> <span>{err}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Kiri: form */}
                <div className="lg:col-span-7 flex flex-col gap-5">
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 flex flex-col gap-4">
                        {/* Judul */}
                        <label className="flex flex-col gap-1.5">
                            <span className="text-sm font-medium text-on-surface">Judul Broadcast <span className="text-error">*</span></span>
                            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="mis. Info Penyaluran Wakaf Kuartal 3"
                                className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                            <span className="text-xs text-on-surface-variant">Hanya untuk catatan internal — tidak ikut terkirim.</span>
                        </label>

                        {/* Target */}
                        <div>
                            <span className="text-sm font-medium text-on-surface">Target Penerima <span className="text-error">*</span></span>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                                {TARGETS.map((t) => (
                                    <label key={t.value} className={`flex flex-col gap-1 p-3 rounded-lg border cursor-pointer transition-colors ${tier === t.value ? "border-primary bg-primary/5" : "border-outline-variant hover:bg-surface-container"
                                        }`}>
                                        <div className="flex items-center gap-2">
                                            <input type="radio" name="target" checked={tier === t.value} onChange={() => setTier(t.value)}
                                                className="w-4 h-4 text-primary focus:ring-primary" />
                                            <span className="text-sm font-medium text-on-surface">{t.label}</span>
                                        </div>
                                        <span className="text-xs text-on-surface-variant pl-6">{t.desc}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Template */}
                        <label className="flex flex-col gap-1.5">
                            <span className="text-sm font-medium text-on-surface">Gunakan Template <span className="text-on-surface-variant font-normal text-xs">(opsional)</span></span>
                            <select value={templateId} onChange={(e) => applyTemplate(e.target.value ? Number(e.target.value) : "")}
                                className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none">
                                <option value="">— Tulis pesan manual —</option>
                                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </label>

                        {/* Editor pesan */}
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
                            <textarea ref={textareaRef} value={message} onChange={(e) => setMessage(e.target.value)} rows={10}
                                placeholder="Ketik pesan... gunakan [Nama], [Nominal], [Project] untuk personalisasi."
                                className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors resize-y leading-relaxed" />
                            <div className="flex justify-between mt-1 text-xs text-on-surface-variant">
                                <span>Variabel akan diganti otomatis per donatur.</span>
                                <span>{message.length} karakter</span>
                            </div>
                        </div>

                        <div className="flex justify-end pt-1">
                            <button onClick={validateThenConfirm}
                                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container transition-colors">
                                <Icon name="send" className="text-[18px]" /> Kirim Sekarang
                            </button>
                        </div>
                    </div>
                </div>

                {/* Kanan: live preview WhatsApp */}
                <div className="lg:col-span-5">
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 sticky top-4">
                        <h3 className="text-base font-semibold text-on-surface mb-4 flex items-center gap-2">
                            <Icon name="smartphone" className="text-[20px] text-primary" /> Live Preview
                        </h3>
                        <div className="mx-auto max-w-[300px] bg-[#0b141a] rounded-[2rem] p-2.5 border-4 border-surface-variant shadow-xl">
                            <div className="bg-[#0b141a] rounded-[1.6rem] overflow-hidden">
                                <div className="bg-[#075E54] text-white px-4 py-3 flex items-center gap-3">
                                    <Icon name="arrow_back" className="text-[18px] text-white/80" />
                                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><Icon name="business" className="text-[16px]" /></div>
                                    <div>
                                        <div className="font-bold text-sm leading-tight">BWKR Official</div>
                                        <div className="text-[10px] text-white/70">Official Account</div>
                                    </div>
                                </div>
                                <div className="min-h-[360px] p-4 bg-[#0d1418]">
                                    <div className="flex justify-center mb-3">
                                        <span className="bg-[#1f2c34] text-[#8696a0] text-[10px] px-3 py-1 rounded uppercase tracking-wide">Hari ini</span>
                                    </div>
                                    <div className="bg-[#005c4b] text-white rounded-lg rounded-tr-none p-3 shadow max-w-[90%] ml-auto">
                                        <p className="text-[13px] leading-snug whitespace-pre-wrap break-words">{preview || "Pesan akan tampil di sini..."}</p>
                                        <div className="text-right mt-1"><span className="text-[10px] text-white/60">10:42 ✓✓</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 rounded-lg bg-surface-container-low p-3 text-xs text-on-surface-variant flex items-center gap-2">
                            <Icon name="info" className="text-[16px] text-primary" />
                            Target saat ini: <span className="font-semibold text-on-surface">{targetLabel}</span>
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmDialog
                open={confirmOpen}
                title="Kirim Broadcast"
                message={`Kirim pesan ini ke ${targetLabel.toLowerCase()}? Notifikasi WhatsApp akan langsung diproses dan tidak bisa dibatalkan.`}
                confirmLabel="Kirim"
                loading={sending}
                onConfirm={doSend}
                onClose={() => setConfirmOpen(false)}
            />
        </div>
    );
}