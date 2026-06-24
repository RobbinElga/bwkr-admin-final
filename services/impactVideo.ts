import type { ImpactVideo, Program, Paginated } from "@/types";
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

export async function getImpactVideos(): Promise<ImpactVideo[]> {
    let res: Response;
    try {
        res = await fetch(`${API}/admin/impact-videos?per_page=100`, {
            headers: { Accept: "application/json", ...authHeaders() },
            cache: "no-store",
        });
    } catch {
        throw new Error("NETWORK");
    }
    if (!res.ok) throw new Error(toErrorCode(res.status));
    const body = await res.json();
    return (body as Paginated<ImpactVideo>).data ?? [];
}

export async function saveImpactVideo(
    payload: { youtube_url: string; caption?: string; program_id?: number | null; project_id?: number | null; order?: number },
    editId?: number
): Promise<ImpactVideo> {
    const isEdit = Boolean(editId);
    const body = {
        youtube_url: payload.youtube_url,
        caption: payload.caption ?? null,
        program_id: payload.program_id ?? null,
        project_id: payload.project_id ?? null,
        order: payload.order ?? 0,
        ...(isEdit ? { _method: "PUT" } : {}),
    };

    let res: Response;
    try {
        res = await fetch(isEdit ? `${API}/admin/impact-videos/${editId}` : `${API}/admin/impact-videos`, {
            method: "POST",
            headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify(body),
        });
    } catch {
        throw new Error("NETWORK");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        if (res.status === 422) {
            const errors = (data as { errors?: Record<string, string[]> }).errors;
            const first = errors ? Object.values(errors)[0]?.[0] : undefined;
            throw new Error(first ?? "Data tidak valid.");
        }
        throw new Error(toErrorCode(res.status));
    }
    return (data as { data: ImpactVideo }).data;
}

export async function deleteImpactVideo(id: number): Promise<void> {
    let res: Response;
    try {
        res = await fetch(`${API}/admin/impact-videos/${id}`, {
            method: "DELETE",
            headers: { Accept: "application/json", ...authHeaders() },
        });
    } catch {
        throw new Error("NETWORK");
    }
    if (!res.ok) throw new Error(toErrorCode(res.status));
}

export async function getProgramsForSelect(): Promise<Program[]> {
    let res: Response;
    try {
        res = await fetch(`${API}/admin/programs?per_page=200`, {
            headers: { Accept: "application/json", ...authHeaders() },
            cache: "no-store",
        });
    } catch {
        throw new Error("NETWORK");
    }
    if (!res.ok) throw new Error(toErrorCode(res.status));
    const body = await res.json();
    return (body as Paginated<Program>).data ?? [];
}