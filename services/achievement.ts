import type { Achievement, Paginated } from "@/types";
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

export async function getAchievements(): Promise<Achievement[]> {
    let res: Response;
    try {
        res = await fetch(`${API}/admin/achievements?per_page=100`, {
            headers: { Accept: "application/json", ...authHeaders() },
            cache: "no-store",
        });
    } catch {
        throw new Error("NETWORK");
    }
    if (!res.ok) throw new Error(toErrorCode(res.status));
    const body = await res.json();
    return (body as Paginated<Achievement>).data ?? [];
}

export async function saveAchievement(
    payload: { count: number; label: string; period?: string; order?: number; image?: File | null },
    editId?: number
): Promise<Achievement> {
    const fd = new FormData();
    fd.set("count", String(payload.count));
    fd.set("label", payload.label);
    if (payload.period) fd.set("period", payload.period);
    fd.set("order", String(payload.order ?? 0));
    if (payload.image) fd.set("image", payload.image);

    const isEdit = Boolean(editId);
    if (isEdit) fd.set("_method", "PUT");
    const url = isEdit ? `${API}/admin/achievements/${editId}` : `${API}/admin/achievements`;

    let res: Response;
    try {
        res = await fetch(url, { method: "POST", headers: { Accept: "application/json", ...authHeaders() }, body: fd });
    } catch {
        throw new Error("NETWORK");
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
        if (res.status === 422) {
            const errors = (body as { errors?: Record<string, string[]> }).errors;
            const first = errors ? Object.values(errors)[0]?.[0] : undefined;
            throw new Error(first ?? "Data tidak valid.");
        }
        throw new Error(toErrorCode(res.status));
    }
    return (body as { data: Achievement }).data;
}

export async function deleteAchievement(id: number): Promise<void> {
    let res: Response;
    try {
        res = await fetch(`${API}/admin/achievements/${id}`, {
            method: "DELETE",
            headers: { Accept: "application/json", ...authHeaders() },
        });
    } catch {
        throw new Error("NETWORK");
    }
    if (!res.ok) throw new Error(toErrorCode(res.status));
}