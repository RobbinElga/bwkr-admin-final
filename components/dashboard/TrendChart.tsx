"use client";

import { formatRupiah } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import type { DonationTrendPoint } from "@/types";

function monthLabel(ym: string): string {
    const [y, m] = ym.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("id-ID", { month: "short" });
}

export function TrendChart({ data }: { data: DonationTrendPoint[] }) {
    const max = Math.max(...data.map((d) => d.total), 1);
    const hasData = data.some((d) => d.total > 0);

    return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-semibold text-on-surface">Tren Donasi</h3>
                <span className="text-xs text-on-surface-variant">12 bulan terakhir</span>
            </div>

            {!hasData ? (
                <div className="h-48 flex flex-col items-center justify-center gap-2 text-on-surface-variant">
                    <Icon name="bar_chart" className="text-[36px] opacity-40" />
                    <p className="text-sm">Belum ada data donasi.</p>
                </div>
            ) : (
                <div className="h-56 flex gap-1.5">
                    {data.map((d) => {
                        const h = Math.max((d.total / max) * 100, 2);
                        return (
                            <div key={d.month} className="flex-1 flex flex-col">
                                <div className="flex-1 flex items-end justify-center relative group">
                                    {d.total > 0 && (
                                        <span className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] bg-inverse-surface text-inverse-on-surface px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                            {formatRupiah(d.total)}
                                        </span>
                                    )}
                                    <div
                                        className="w-full max-w-[26px] rounded-t bg-primary/70 group-hover:bg-primary transition-colors"
                                        style={{ height: `${h}%` }}
                                    />
                                </div>
                                <span className="text-[10px] text-center text-on-surface-variant mt-1.5">
                                    {monthLabel(d.month)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}