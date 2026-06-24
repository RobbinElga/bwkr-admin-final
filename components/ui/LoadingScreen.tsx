"use client";

import { useEffect, useState } from "react";

export function LoadingScreen() {
    const [progress, setProgress] = useState(15);

    // progress palsu: cepat di awal, melambat mendekati 98%
    useEffect(() => {
        const id = setInterval(() => {
            setProgress((p) => {
                if (p >= 98) return p;
                const step = Math.max(0.2, (100 - p) / 30);
                return Math.min(98, p + Math.random() * step);
            });
        }, 800);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-[#002116] text-[#e1e3e4]">
            {/* latar kedalaman emerald */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,95,70,0.2),#002116_55%,#0b0e0f)]" />

            <main className="relative z-10 flex w-full max-w-lg flex-col items-center px-8">
                {/* Logo + cincin dekoratif */}
                <div className="bwkr-fade-in mb-8 rounded-[2rem] border border-white/5 bg-[#065f46]/10 p-8 shadow-2xl shadow-black/40 backdrop-blur-xl" style={{ animationDelay: "100ms" }}>
                    <div className="relative flex h-32 w-32 items-center justify-center">
                        <div className="absolute inset-0 rounded-full border border-[#8bd6b6]/20 animate-[spin_30s_linear_infinite]" />
                        <div className="absolute inset-2 rounded-full border border-[#8bd6b6]/10 animate-[spin_20s_linear_infinite_reverse]" />
                        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#065f46]/40">
                            <span className="material-symbols-outlined text-[#a6f2d1]"
                                style={{ fontSize: 56, fontVariationSettings: "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 48" }}>

                            </span>
                        </div>
                    </div>
                </div>

                {/* Teks + progress bar shimmer */}
                <div className="bwkr-fade-in w-full text-center" style={{ animationDelay: "400ms" }}>
                    <h1 className="text-xl font-semibold tracking-tight text-[#8bd6b6]">BWKR Admin</h1>
                    <p className="mt-1 text-sm text-[#bec9c2]">Memuat...</p>
                    <div className="relative mx-auto mt-6 h-1.5 w-64 overflow-hidden rounded-full bg-white/5">
                        <div className="bwkr-shimmer h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${progress}%` }} />
                    </div>
                </div>
            </main>
        </div>
    );
}