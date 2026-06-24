import type { LedgerEntry, LedgerSummary } from "@/types";
import { getToken } from "@/services/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

function authHeaders(): HeadersInit {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getCashLedger(): Promise<{ data: LedgerEntry[]; summary: LedgerSummary }> {
    const res = await fetch(`${API}/admin/keuangan/ledger`, {
        headers: { Accept: "application/json", ...authHeaders() },
        cache: "no-store",
    });
    if (res.status === 401 || res.status === 403) throw new Error("UNAUTHORIZED");
    if (!res.ok) throw new Error("SERVER");
    return res.json();
}