// app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    loginStaff,
    verifyTwoFactor,
    setToken,
    setSetupToken,
} from "@/services/auth";
import { useAdminAuth } from "@/stores/auth";
import { Icon } from "@/components/ui/Icon";

type Step = "credentials" | "verify";

export default function LoginPage() {
    const router = useRouter();
    const setUser = useAdminAuth((s) => s.setUser);

    const [step, setStep] = useState<Step>("credentials");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [code, setCode] = useState("");
    const [challengeToken, setChallengeToken] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleCredentials(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        if (!email || !password) { setError("Email dan kata sandi wajib diisi."); return; }
        setLoading(true);
        try {
            const res = await loginStaff(email, password);
            if (res.status === "2fa_required") {
                setChallengeToken(res.challenge_token);
                setStep("verify");
            } else if (res.status === "2fa_setup_required") {
                // Simpan setup_token lalu ke halaman setup QR
                setSetupToken(res.setup_token);
                router.push("/2fa/setup");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Gagal masuk.");
        } finally {
            setLoading(false);
        }
    }

    async function handleVerify(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        if (code.trim().length < 6) { setError("Masukkan 6 digit kode autentikasi."); return; }
        setLoading(true);
        try {
            const res = await verifyTwoFactor(challengeToken, code.trim());
            setToken(res.token);
            setUser(res.user, res.token);
            router.replace("/dashboard");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Kode tidak valid.");
            setCode("");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-background px-4">
            <div className="w-full max-w-md">
                {/* Brand */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center text-on-primary mb-4 shadow-sm">
                        <Icon name="volunteer_activism" filled className="text-[28px]" />
                    </div>
                    <h1 className="text-2xl font-bold text-on-background">BWKR Admin</h1>
                    <p className="text-sm text-on-surface-variant mt-1">Wakaf Stewardship</p>
                </div>

                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] p-6 sm:p-8">
                    {error && (
                        <div className="mb-5 flex items-start gap-2 rounded-lg bg-error-container px-4 py-3 text-sm text-on-error-container">
                            <Icon name="error" className="text-[18px] mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {step === "credentials" ? (
                        <form onSubmit={handleCredentials} className="flex flex-col gap-4">
                            <div>
                                <h2 className="text-lg font-semibold text-on-surface">Masuk ke Panel</h2>
                                <p className="text-sm text-on-surface-variant mt-1">Gunakan akun staff terdaftar.</p>
                            </div>

                            <label className="flex flex-col gap-1.5">
                                <span className="text-sm font-medium text-on-surface">Email</span>
                                <input
                                    type="email"
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@bwkr.id"
                                    className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                                />
                            </label>

                            <label className="flex flex-col gap-1.5">
                                <span className="text-sm font-medium text-on-surface">Kata Sandi</span>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="current-password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-2.5 pr-11 text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((v) => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                                        tabIndex={-1}
                                    >
                                        <Icon name={showPassword ? "visibility_off" : "visibility"} className="text-[20px]" />
                                    </button>
                                </div>
                            </label>

                            <button
                                type="submit"
                                disabled={loading}
                                className="mt-2 w-full rounded-lg bg-primary py-3 font-semibold text-on-primary hover:bg-primary-container transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <><Icon name="progress_activity" className="text-[20px] animate-spin" />Memproses...</>
                                ) : "Lanjutkan"}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerify} className="flex flex-col gap-4">
                            <button
                                type="button"
                                onClick={() => { setStep("credentials"); setCode(""); setError(null); }}
                                className="self-start flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors"
                            >
                                <Icon name="arrow_back" className="text-[18px]" />Kembali
                            </button>

                            <div>
                                <h2 className="text-lg font-semibold text-on-surface">Verifikasi 2FA</h2>
                                <p className="text-sm text-on-surface-variant mt-1">
                                    Masukkan 6 digit kode dari aplikasi authenticator Anda.
                                </p>
                            </div>

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

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full rounded-lg bg-primary py-3 font-semibold text-on-primary hover:bg-primary-container transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <><Icon name="progress_activity" className="text-[20px] animate-spin" />Memverifikasi...</>
                                ) : "Masuk"}
                            </button>

                            {/* Link pakai backup code */}
                            <p className="text-center text-sm text-on-surface-variant">
                                Tidak punya akses ke HP?{" "}
                                <button
                                    type="button"
                                    onClick={() => router.push(`/2fa/backup?token=${encodeURIComponent(challengeToken)}`)}
                                    className="text-primary hover:underline font-medium"
                                >
                                    Pakai kode cadangan
                                </button>
                            </p>
                        </form>
                    )}
                </div>
                <p className="text-center text-xs text-on-surface-variant mt-6">
                    Panel internal BWKR — hanya untuk staff resmi.
                </p>
            </div>
        </main>
    );
}