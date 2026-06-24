import type { Partner, Paginated } from "@/types";
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

export async function getPartners(): Promise<Partner[]> {
    let res: Response;
    try {
        res = await fetch(`${API}/admin/partners?per_page=100`, {
            headers: { Accept: "application/json", ...authHeaders() },
            cache: "no-store",
        });
    } catch {
        throw new Error("NETWORK");
    }
    if (!res.ok) throw new Error(toErrorCode(res.status));
    const body = await res.json();
    return (body as Paginated<Partner>).data ?? [];
}

export async function savePartner(
    payload: {
        name: string;
        type?: string;
        pic_name?: string;
        pic_phone?: string;
        pic_email?: string;
        is_visible: boolean;
        logo?: File | null;
    },
    editId?: number
): Promise<Partner> {
    const fd = new FormData();
    fd.set("name", payload.name);
    if (payload.type) fd.set("type", payload.type);
    if (payload.pic_name) fd.set("pic_name", payload.pic_name);
    if (payload.pic_phone) fd.set("pic_phone", payload.pic_phone);
    if (payload.pic_email) fd.set("pic_email", payload.pic_email);
    fd.set("is_visible", payload.is_visible ? "1" : "0");
    if (payload.logo) fd.set("logo", payload.logo);

    const isEdit = Boolean(editId);
    if (isEdit) fd.set("_method", "PUT");
    const url = isEdit ? `${API}/admin/partners/${editId}` : `${API}/admin/partners`;

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
    return (body as { data: Partner }).data;
}

export async function deletePartner(id: number): Promise<void> {
    let res: Response;
    try {
        res = await fetch(`${API}/admin/partners/${id}`, {
            method: "DELETE",
            headers: { Accept: "application/json", ...authHeaders() },
        });
    } catch {
        throw new Error("NETWORK");
    }
    if (!res.ok) throw new Error(toErrorCode(res.status));
}