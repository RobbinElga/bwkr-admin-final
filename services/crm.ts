import type { CrmDonor, CrmDonorDetail, BroadcastTemplate, DonorTier, Paginated } from "@/types";
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

/* ---------- Donatur ---------- */
export async function getCrmDonors(params: { search?: string; tier?: DonorTier | ""; page?: number } = {}): Promise<Paginated<CrmDonor>> {
    const qs = new URLSearchParams();
    if (params.search) qs.set("search", params.search);
    if (params.tier) qs.set("tier", params.tier);
    if (params.page) qs.set("page", String(params.page));

    let res: Response;
    try {
        res = await fetch(`${API}/admin/crm/donors?${qs}`, { headers: { Accept: "application/json", ...authHeaders() }, cache: "no-store" });
    } catch { throw new Error("NETWORK"); }
    if (!res.ok) throw new Error(toErrorCode(res.status));
    return res.json();
}

export async function getCrmDonor(hash: string): Promise<CrmDonorDetail> {
    let res: Response;
    try {
        res = await fetch(`${API}/admin/crm/donors/${hash}`, { headers: { Accept: "application/json", ...authHeaders() }, cache: "no-store" });
    } catch { throw new Error("NETWORK"); }
    if (!res.ok) throw new Error(toErrorCode(res.status));
    return res.json();
}

export async function updateDonorTier(hash: string, tier: DonorTier): Promise<void> {
    let res: Response;
    try {
        res = await fetch(`${API}/admin/crm/donors/${hash}/tier`, {
            method: "PUT",
            headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify({ tier }),
        });
    } catch { throw new Error("NETWORK"); }
    if (!res.ok) throw new Error(toErrorCode(res.status));
}

/* ---------- Template ---------- */
export async function getTemplates(): Promise<BroadcastTemplate[]> {
    let res: Response;
    try {
        res = await fetch(`${API}/admin/crm/templates?per_page=100`, { headers: { Accept: "application/json", ...authHeaders() }, cache: "no-store" });
    } catch { throw new Error("NETWORK"); }
    if (!res.ok) throw new Error(toErrorCode(res.status));
    const body = await res.json();
    return (body as Paginated<BroadcastTemplate>).data ?? [];
}

export async function saveTemplate(payload: { name: string; content: string }, editId?: number): Promise<BroadcastTemplate> {
    const isEdit = Boolean(editId);
    let res: Response;
    try {
        res = await fetch(isEdit ? `${API}/admin/crm/templates/${editId}` : `${API}/admin/crm/templates`, {
            method: isEdit ? "PUT" : "POST",
            headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify(payload),
        });
    } catch { throw new Error("NETWORK"); }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
        if (res.status === 422) {
            const errors = (body as { errors?: Record<string, string[]> }).errors;
            throw new Error(errors ? Object.values(errors)[0]?.[0] ?? "Data tidak valid." : "Data tidak valid.");
        }
        throw new Error(toErrorCode(res.status));
    }
    return (body as { data: BroadcastTemplate }).data;
}

export async function deleteTemplate(id: number): Promise<void> {
    let res: Response;
    try {
        res = await fetch(`${API}/admin/crm/templates/${id}`, { method: "DELETE", headers: { Accept: "application/json", ...authHeaders() } });
    } catch { throw new Error("NETWORK"); }
    if (!res.ok) throw new Error(toErrorCode(res.status));
}

/* ---------- Broadcast ---------- */
export async function sendBroadcast(payload: {
    title: string;
    template_id?: number | null;
    message?: string;
    tier?: DonorTier | "";
    phone_hashes?: string[];
}): Promise<{ message: string; sent: number }> {
    const body: Record<string, unknown> = { title: payload.title };
    if (payload.template_id) body.template_id = payload.template_id;
    if (payload.message) body.message = payload.message;
    if (payload.tier) body.tier = payload.tier;
    if (payload.phone_hashes?.length) body.phone_hashes = payload.phone_hashes;

    let res: Response;
    try {
        res = await fetch(`${API}/admin/crm/broadcast`, {
            method: "POST",
            headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify(body),
        });
    } catch { throw new Error("NETWORK"); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        if (res.status === 422) {
            const errors = (data as { errors?: Record<string, string[]> }).errors;
            const first = errors ? Object.values(errors)[0]?.[0] : undefined;
            throw new Error(first ?? (data as { message?: string }).message ?? "Data tidak valid.");
        }
        throw new Error((data as { message?: string }).message ?? toErrorCode(res.status));
    }
    return data as { message: string; sent: number };
}

export async function getBroadcasts(page = 1): Promise<Paginated<Broadcast>> {
    let res: Response;
    try {
        res = await fetch(`${API}/admin/crm/broadcasts?page=${page}`, {
            headers: { Accept: "application/json", ...authHeaders() }, cache: "no-store",
        });
    } catch { throw new Error("NETWORK"); }
    if (!res.ok) throw new Error(toErrorCode(res.status));
    return res.json();
}

export interface Broadcast {
    id: number;
    title: string;
    message: string | null;
    template_id: number | null;
    template_name?: string | null;
    tier: DonorTier | null;
    status: "sent" | "failed";
    recipient_count: number | null;
    sent_at: string | null;
    created_at: string;
}