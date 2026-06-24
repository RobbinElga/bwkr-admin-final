import type { Claim, Project, Paginated, ClaimStatus } from "@/types";
import { getToken } from "@/services/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

function authHeaders(): HeadersInit {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}
function toErrorCode(status: number): string {
    if (status === 401 || status === 403) return "UNAUTHORIZED";
    if (status === 422) return "VALIDATION";
    return "SERVER";
}
async function postJson(url: string, body?: object): Promise<Response> {
    try {
        return await fetch(url, {
            method: "POST",
            headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
            body: body ? JSON.stringify(body) : undefined,
        });
    } catch {
        throw new Error("NETWORK");
    }
}
function firstError(body: unknown): string | undefined {
    const errors = (body as { errors?: Record<string, string[]> })?.errors;
    return errors ? Object.values(errors)[0]?.[0] : (body as { message?: string })?.message;
}

export async function createClaim(payload: { donation_input_id: number; project_id: number; amount: number; notes?: string }): Promise<Claim> {
    const res = await postJson(`${API}/admin/donations-claim`, payload);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
        if (res.status === 422) throw new Error(firstError(body) ?? "Data tidak valid.");
        throw new Error(toErrorCode(res.status));
    }
    return (body as { data: Claim }).data;
}

export async function approveClaim(id: number): Promise<void> {
    const res = await postJson(`${API}/admin/donations-claim/${id}/approve`);
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 422) throw new Error(firstError(body) ?? "Klaim sudah diproses.");
        throw new Error(toErrorCode(res.status));
    }
}

export async function rejectClaim(id: number, notes?: string): Promise<void> {
    const res = await postJson(`${API}/admin/donations-claim/${id}/reject`, { notes });
    if (!res.ok) throw new Error(toErrorCode(res.status));
}

/** Daftar project untuk dropdown alokasi (ambil yang berjalan). */
export async function getClaimProjects(): Promise<Project[]> {
    let res: Response;
    try {
        res = await fetch(`${API}/admin/projects?per_page=200`, {
            headers: { Accept: "application/json", ...authHeaders() },
            cache: "no-store",
        });
    } catch {
        throw new Error("NETWORK");
    }
    if (!res.ok) throw new Error(toErrorCode(res.status));
    const body = await res.json();
    const list = (body as Paginated<Project>).data ?? [];
    return list.filter((p) => p.status === "berjalan");
}

/** Ambil bukti transfer (file ber-auth) → object URL untuk dibuka. */
export async function getDonationProof(donationId: number): Promise<string> {
    let res: Response;
    try {
        res = await fetch(`${API}/admin/donations-input/${donationId}/proof`, {
            headers: { Accept: "application/octet-stream", ...authHeaders() },
        });
    } catch {
        throw new Error("NETWORK");
    }
    if (!res.ok) throw new Error(toErrorCode(res.status));
    const blob = await res.blob();
    return URL.createObjectURL(blob);
}

export async function getClaims(params: { status?: ClaimStatus | ""; page?: number } = {}): Promise<Paginated<Claim>> {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    if (params.page) qs.set("page", String(params.page));

    let res: Response;
    try {
        res = await fetch(`${API}/admin/donations-claim?${qs}`, {
            headers: { Accept: "application/json", ...authHeaders() },
            cache: "no-store",
        });
    } catch {
        throw new Error("NETWORK");
    }
    if (!res.ok) throw new Error(toErrorCode(res.status));
    return res.json();
}