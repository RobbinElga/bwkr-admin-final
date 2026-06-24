// app/2fa/setup/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSetupToken, clearSetupToken, setup2FA, enable2FA, setToken } from "@/services/auth";
import { useAdminAuth } from "@/stores/auth";
import { Icon } from "@/components/ui/Icon";

type Step = "scan" | "backup";

export default function TwoFactorSetupPage() {
    const router = useRouter();
    const setUser = useAdminAuth((s) => s.setUser);

    const [step, setStep] = useState<Step>("scan");
    const [qrSvg, setQrSvg] = useState<string | null>(null);
    const [secret, setSecret] = useState<string | null>(null);
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const setupToken = getSetupToken();
        if (!setupToken) { router.replace("/login"); return; }

        setup2FA(setupToken).then((data) => {
            setQrSvg(data.qr_svg);
            setSecret(data.secret);
        }).catch(() => {
            router.replace("/login");
        });
    }, [router]);

    async function handleEnable(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        if (code.trim().length < 6) { setError("Masukkan 6 digit kode dari aplikasi."); return; }
        setLoading(true);
        try {
            const setupToken = getSetupToken()!;
            const res = await enable2FA(setupToken, code.trim());
            clearSetupToken();
            // Simpan token permanen + set user
            setToken(res.token);
            setUser(res.user, res.token);
            // Tampilkan backup codes sebelum masuk dashboard
            setBackupCodes(res.backup_codes ?? []);
            setStep("backup");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Kode tidak valid.");
            setCode("");
        } finally {
            setLoading(false);
        }
    }

    function handleCopyAll() {
        navigator.clipboard.writeText(backupCodes.join("\n"));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    if (step === "backup") {
        return (
            <main className="min-h-screen flex items-center justify-center bg-background px-4">
                <div className="w-full max-w-md">
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] p-6 sm:p-8">
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center mb-3">
                                <Icon name="key" filled className="text-[24px] text-on-primary-fixed" />
                            </div>
                            <h2 className="text-lg font-semibold text-on-surface">Simpan Kode Cadangan</h2>
                            <p className="text-sm text-on-surface-variant mt-1">
                                Simpan 8 kode ini di tempat aman. Masing-masing hanya bisa dipakai sekali
                                jika kamu kehilangan akses ke aplikasi authenticator.
                            </p>
                        </div>

                        <div className="bg-surface-container rounded-lg p-4 mb-4 grid grid-cols-2 gap-2">
                            {backupCodes.map((c, i) => (
                                <code key={i} className="text-center text-sm font-mono bg-surface-container-lowest rounded px-3 py-1.5 text-on-surface border border-outline-variant">
                                    {c}
                                </code>
                            ))}
                        </div>

                        <button
                            onClick={handleCopyAll}
                            className="w-full flex items-center justify-center gap-2 py-2.5 border border-outline-variant rounded-lg text-sm font-medium text-on-surface hover:bg-surface-container transition-colors mb-4"
                        >
                            <Icon name={copied ? "check" : "content_copy"} className="text-[18px]" />
                            {copied ? "Tersalin!" : "Salin Semua Kode"}
                        </button>

                        <div className="flex items-start gap-2 bg-error-container/40 rounded-lg px-3 py-2.5 mb-6 text-sm text-on-error-container">
                            <Icon name="warning" className="text-[18px] mt-0.5 shrink-0" />
                            <span>Kode ini tidak akan ditampilkan lagi. Pastikan sudah disimpan sebelum lanjut.</span>
                        </div>

                        <button
                            onClick={() => router.replace("/dashboard")}
                            className="w-full rounded-lg bg-primary py-3 font-semibold text-on-primary hover:bg-primary-container transition-colors"
                        >
                            Saya sudah simpan — Masuk Dashboard
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-background px-4">
            <div className="w-full max-w-md">
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] p-6 sm:p-8">
                    <div className="flex flex-col items-center text-center mb-6">
                        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center mb-3">
                            <Icon name="qr_code_scanner" filled className="text-[24px] text-on-primary" />
                        </div>
                        <h2 className="text-lg font-semibold text-on-surface">Aktifkan 2FA</h2>
                        <p className="text-sm text-on-surface-variant mt-1">
                            Scan QR code ini dengan Google Authenticator atau Authy, lalu masukkan kode yang muncul.
                        </p>
                    </div>

                    {/* QR Code */}
                    <div className="flex justify-center mb-4">
                        {qrSvg ? (
                            <div
                                className="w-48 h-48 rounded-lg border border-outline-variant bg-white p-2 [&>svg]:w-full [&>svg]:h-full"
                                dangerouslySetInnerHTML={{ __html: qrSvg }}
                            />
                        ) : (
                            <div className="w-48 h-48 rounded-lg border border-outline-variant bg-surface-container flex items-center justify-center">
                                <Icon name="progress_activity" className="text-[32px] text-primary animate-spin" />
                            </div>
                        )}
                    </div>

                    {/* Manual secret */}
                    {secret && (
                        <div className="mb-5 text-center">
                            <p className="text-xs text-on-surface-variant mb-1">Atau masukkan kode manual:</p>
                            <code className="text-sm font-mono bg-surface-container px-3 py-1.5 rounded border border-outline-variant text-on-surface tracking-widest">
                                {secret}
                            </code>
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 flex items-start gap-2 rounded-lg bg-error-container px-4 py-3 text-sm text-on-error-container">
                            <Icon name="error" className="text-[18px] mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleEnable} className="flex flex-col gap-4">
                        <label className="flex flex-col gap-1.5">
                            <span className="text-sm font-medium text-on-surface">Kode Verifikasi</span>
                            <input
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                                placeholder="000000"
                                autoFocus
                                className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-center text-2xl font-semibold tracking-[0.4em] text-on-surface placeholder:text-outline placeholder:tracking-[0.4em] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                            />
                        </label>

                        <button
                            type="submit"
                            disabled={loading || !qrSvg}
                            className="w-full rounded-lg bg-primary py-3 font-semibold text-on-primary hover:bg-primary-container transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <><Icon name="progress_activity" className="text-[20px] animate-spin" />Mengaktifkan...</>
                            ) : "Aktifkan 2FA"}
                        </button>
                    </form>
                </div>
            </div>
        </main>
    );
}