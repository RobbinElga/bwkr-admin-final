// app/2fa/backup/page.tsx
"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAdminAuth } from "@/stores/auth";
import { setToken } from "@/services/auth";
import { Icon } from "@/components/ui/Icon";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

function BackupCodeForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const challengeToken = searchParams.get("token") ?? "";
    const setUser = useAdminAuth((s) => s.setUser);

    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        if (!code.trim()) { setError("Masukkan kode cadangan."); return; }
        if (!challengeToken) { router.replace("/login"); return; }
        setLoading(true);
        try {
            const res = await fetch(`${API}/auth/masuk-sistem/2fa`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    Authorization: `Bearer ${challengeToken}`,
                },
                body: JSON.stringify({ code: code.trim(), is_recovery: true }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.message ?? "Kode cadangan tidak valid.");
            setToken(body.token);
            setUser(body.user, body.token);
            router.replace("/dashboard");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Gagal verifikasi.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] p-6 sm:p-8">
            <button
                onClick={() => router.back()}
                className="self-start flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors mb-5"
            >
                <Icon name="arrow_back" className="text-[18px]" /> Kembali
            </button>

            <div className="flex flex-col items-center text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center mb-3">
                    <Icon name="key" filled className="text-[24px] text-on-secondary-container" />
                </div>
                <h2 className="text-lg font-semibold text-on-surface">Kode Cadangan</h2>
                <p className="text-sm text-on-surface-variant mt-1">
                    Masukkan salah satu dari 8 kode cadangan yang sudah kamu simpan sebelumnya.
                </p>
            </div>

            {error && (
                <div className="mb-4 flex items-start gap-2 rounded-lg bg-error-container px-4 py-3 text-sm text-on-error-container">
                    <Icon name="error" className="text-[18px] mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-on-surface">Kode Cadangan</span>
                    <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        placeholder="XXXXXXXX"
                        autoFocus
                        className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-center text-lg font-mono tracking-widest text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                    />
                </label>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-primary py-3 font-semibold text-on-primary hover:bg-primary-container transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <><Icon name="progress_activity" className="text-[20px] animate-spin" />Memverifikasi...</>
                    ) : "Verifikasi"}
                </button>
            </form>
        </div>
    );
}

export default function BackupCodePage() {
    const router = useRouter();
    return (
        <main className="min-h-screen flex items-center justify-center bg-background px-4">
            <div className="w-full max-w-md">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center text-on-primary mb-4 shadow-sm">
                        <Icon name="volunteer_activism" filled className="text-[28px]" />
                    </div>
                    <h1 className="text-2xl font-bold text-on-background">BWKR Admin</h1>
                </div>
                <Suspense fallback={<div className="text-center text-on-surface-variant">Memuat...</div>}>
                    <BackupCodeForm />
                </Suspense>
                <p className="text-center text-xs text-on-surface-variant mt-6">
                    Panel internal BWKR — hanya untuk staff resmi.
                </p>
            </div>
        </main>
    );
}