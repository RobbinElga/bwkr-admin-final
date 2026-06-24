import type { Testimonial, Paginated } from "@/types";
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

export async function getTestimonials(): Promise<Testimonial[]> {
    let res: Response;
    try {
        res = await fetch(`${API}/admin/testimonials?per_page=100`, {
            headers: { Accept: "application/json", ...authHeaders() },
            cache: "no-store",
        });
    } catch {
        throw new Error("NETWORK");
    }
    if (!res.ok) throw new Error(toErrorCode(res.status));
    const body = await res.json();
    return (body as Paginated<Testimonial>).data ?? [];
}

export async function saveTestimonial(
    payload: { name: string; title?: string; content: string; is_visible: boolean; order?: number; photo?: File | null },
    editId?: number
): Promise<Testimonial> {
    const fd = new FormData();
    fd.set("name", payload.name);
    if (payload.title) fd.set("title", payload.title);
    fd.set("content", payload.content);
    fd.set("is_visible", payload.is_visible ? "1" : "0");
    fd.set("order", String(payload.order ?? 0));
    if (payload.photo) fd.set("photo", payload.photo);

    const isEdit = Boolean(editId);
    if (isEdit) fd.set("_method", "PUT");
    const url = isEdit ? `${API}/admin/testimonials/${editId}` : `${API}/admin/testimonials`;

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
    return (body as { data: Testimonial }).data;
}

export async function deleteTestimonial(id: number): Promise<void> {
    let res: Response;
    try {
        res = await fetch(`${API}/admin/testimonials/${id}`, {
            method: "DELETE",
            headers: { Accept: "application/json", ...authHeaders() },
        });
    } catch {
        throw new Error("NETWORK");
    }
    if (!res.ok) throw new Error(toErrorCode(res.status));
}