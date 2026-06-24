export function formatRupiah(n: number): string {
    return "Rp " + new Intl.NumberFormat("id-ID").format(n ?? 0);
}

export function formatDate(iso: string | null): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("id-ID", {
        day: "numeric", month: "short", year: "numeric",
    });
}

export function formatDateTime(iso: string | null): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("id-ID", {
        day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

export function formatPercent(n: number): string {
    return `${Math.round(n)}%`;
}