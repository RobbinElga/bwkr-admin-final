import type { Program, ProgramStatus, Paginated } from "@/types";
import { getToken } from "@/services/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

function authHeaders(): HeadersInit {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Map status HTTP → kode error generik (tidak membocorkan pesan server). */
function toErrorCode(status: number): string {
    if (status === 401 || status === 403) return "UNAUTHORIZED";
    if (status === 422) return "VALIDATION";
    return "SERVER";
}

export interface ProgramListParams {
    search?: string;
    status?: ProgramStatus | "";
    page?: number;
}

export async function getPrograms(params: ProgramListParams = {}): Promise<Paginated<Program>> {
    const qs = new URLSearchParams();
    if (params.search) qs.set("search", params.search);
    if (params.status) qs.set("status", params.status);
    if (params.page) qs.set("page", String(params.page));

    let res: Response;
    try {
        res = await fetch(`${API}/admin/programs?${qs}`, {
            headers: { Accept: "application/json", ...authHeaders() },
            cache: "no-store",
        });
    } catch {
        throw new Error("NETWORK");
    }
    if (!res.ok) throw new Error(toErrorCode(res.status));
    return res.json();
}

/**
 * Simpan program (create / update). Pakai FormData karena ada gambar.
 * Untuk update, sertakan `slug` (slug lama) → endpoint POST + _method=PUT.
 */
export async function saveProgram(
    payload: {
        name: string;
        slug?: string;        // slug yang diinginkan (opsional)
        description?: string;
        status?: ProgramStatus;
        order?: number;
        image?: File | null;
        remove_image?: boolean;
    },
    editSlug?: string       // jika diisi → mode UPDATE pada program dgn slug ini
): Promise<Program> {
    const fd = new FormData();
    fd.set("name", payload.name);
    if (payload.slug) fd.set("slug", payload.slug);
    if (payload.description != null) fd.set("description", payload.description);
    if (payload.status) fd.set("status", payload.status);
    if (payload.order != null) fd.set("order", String(payload.order));
    if (payload.image) fd.set("image", payload.image);
    if (payload.remove_image) fd.set("remove_image", "1");

    const isUpdate = Boolean(editSlug);
    if (isUpdate) fd.set("_method", "PUT"); // method spoofing untuk multipart

    const url = isUpdate ? `${API}/admin/programs/${editSlug}` : `${API}/admin/programs`;

    let res: Response;
    try {
        res = await fetch(url, {
            method: "POST", // selalu POST; update via _method
            headers: { Accept: "application/json", ...authHeaders() },
            body: fd,
        });
    } catch {
        throw new Error("NETWORK");
    }

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
        // Untuk validasi (422), kita boleh teruskan pesan field krn ini input user sendiri
        if (res.status === 422) {
            const errors = (body as { errors?: Record<string, string[]> }).errors;
            const first = errors ? Object.values(errors)[0]?.[0] : undefined;
            throw new Error(first ?? "Data tidak valid.");
        }
        throw new Error(toErrorCode(res.status));
    }

    return (body as { data: Program }).data;
}

export async function deleteProgram(slug: string): Promise<void> {
    let res: Response;
    try {
        res = await fetch(`${API}/admin/programs/${slug}`, {
            method: "DELETE",
            headers: { Accept: "application/json", ...authHeaders() },
        });
    } catch {
        throw new Error("NETWORK");
    }
    if (!res.ok) throw new Error(toErrorCode(res.status));
}

export async function getProgram(slug: string): Promise<Program> {
    let res: Response;
    try {
        res = await fetch(`${API}/admin/programs/${slug}`, {
            headers: { Accept: "application/json", ...authHeaders() },
            cache: "no-store",
        });
    } catch {
        throw new Error("NETWORK");
    }
    if (!res.ok) throw new Error(toErrorCode(res.status));
    const body = await res.json();
    return (body as { data: Program }).data;
}

export async function getTrashedPrograms(): Promise<Program[]> {
    let res: Response;
    try {
        res = await fetch(`${API}/admin/programs/trashed`, { headers: { Accept: "application/json", ...authHeaders() }, cache: "no-store" });
    } catch { throw new Error("NETWORK"); }
    if (!res.ok) throw new Error(toErrorCode(res.status));
    return (await res.json() as { data: Program[] }).data;
}

export async function restoreProgram(id: number): Promise<void> {
    let res: Response;
    try {
        res = await fetch(`${API}/admin/programs/${id}/restore`, { method: "POST", headers: { Accept: "application/json", ...authHeaders() } });
    } catch { throw new Error("NETWORK"); }
    if (!res.ok) throw new Error(toErrorCode(res.status));
}

export async function forceDeleteProgram(id: number): Promise<void> {
    let res: Response;
    try {
        res = await fetch(`${API}/admin/programs/${id}/force`, { method: "DELETE", headers: { Accept: "application/json", ...authHeaders() } });
    } catch { throw new Error("NETWORK"); }
    if (!res.ok) throw new Error(toErrorCode(res.status));
}