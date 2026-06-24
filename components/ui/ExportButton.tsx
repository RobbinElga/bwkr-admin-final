"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useAdminAuth } from "@/stores/auth";
import { downloadExport } from "@/services/export";

const PRESETS: { value: string; label: string }[] = [
    { value: "", label: "Semua" },
    { value: "1d", label: "1 hari" },
    { value: "7d", label: "7 hari" },
    { value: "30d", label: "30 hari" },
    { value: "90d", label: "90 hari" },
    { value: "custom", label: "Custom" },
];

export function ExportButton({ path, params = {}, name }: {
    path: string;
    params?: Record<string, string | number | undefined>;
    name: string;
}) {
    const role = useAdminAuth((s) => s.user?.role);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState<"excel" | "pdf" | null>(null);
    const [period, setPeriod] = useState<string>("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function onClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, []);

    if (role !== "super_admin" && role !== "admin") return null;

    function periodParams(): Record<string, string | number | undefined> {
        if (!period) return {};
        if (period === "custom") {
            return { period: "custom", date_from: dateFrom || undefined, date_to: dateTo || undefined };
        }
        return { period };
    }

    async function run(format: "excel" | "pdf") {
        setLoading(format);
        try {
            await downloadExport(path, { ...params, ...periodParams() }, format, name);
            setOpen(false);
        } catch (e) {
            alert(e instanceof Error ? e.message : "Gagal mengunduh.");
        } finally {
            setLoading(null);
        }
    }

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container transition-colors"
            >
                <Icon name="download" className="text-[18px]" /> Export
                <Icon name="expand_more" className="text-[16px]" />
            </button>

            {open && (
                <div className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-xl">
                    {/* Pilih periode */}
                    <div className="border-b border-outline-variant p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Periode</p>
                        <div className="flex flex-wrap gap-1.5">
                            {PRESETS.map((p) => (
                                <button
                                    key={p.value || "all"}
                                    onClick={() => setPeriod(p.value)}
                                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${period === p.value ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        {period === "custom" && (
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                <label className="flex flex-col gap-1">
                                    <span className="text-[11px] text-on-surface-variant">Dari</span>
                                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                                        className="rounded-lg border border-outline-variant bg-surface px-2 py-1.5 text-xs text-on-surface focus:border-primary outline-none" />
                                </label>
                                <label className="flex flex-col gap-1">
                                    <span className="text-[11px] text-on-surface-variant">Sampai</span>
                                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                                        className="rounded-lg border border-outline-variant bg-surface px-2 py-1.5 text-xs text-on-surface focus:border-primary outline-none" />
                                </label>
                            </div>
                        )}
                    </div>

                    {/* Pilih format */}
                    <button onClick={() => run("excel")} disabled={loading !== null}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container-low disabled:opacity-60">
                        <Icon name={loading === "excel" ? "progress_activity" : "table_view"} className={`text-[18px] text-primary ${loading === "excel" ? "animate-spin" : ""}`} /> Excel (.xlsx)
                    </button>
                    <button onClick={() => run("pdf")} disabled={loading !== null}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container-low disabled:opacity-60">
                        <Icon name={loading === "pdf" ? "progress_activity" : "picture_as_pdf"} className={`text-[18px] text-error ${loading === "pdf" ? "animate-spin" : ""}`} /> PDF (.pdf)
                    </button>
                </div>
            )}
        </div>
    );
}