import type { ReportItem, ReportCategory, Paginated } from "@/types";
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

export interface ReportListParams {
    category?: ReportCategory | "";
    search?: string;
    page?: number;
}

export async function getReportList(params: ReportListParams = {}): Promise<Paginated<ReportItem>> {
    const qs = new URLSearchParams();
    if (params.category) qs.set("category", params.category);
    if (params.search) qs.set("search", params.search);
    if (params.page) qs.set("page", String(params.page));

    let res: Response;
    try {
        res = await fetch(`${API}/admin/reports?${qs}`, {
            headers: { Accept: "application/json", ...authHeaders() },
            cache: "no-store",
        });
    } catch {
        throw new Error("NETWORK");
    }
    if (!res.ok) throw new Error(toErrorCode(res.status));
    return res.json();
}

export async function deleteReport(slug: string): Promise<void> {
    let res: Response;
    try {
        res = await fetch(`${API}/admin/reports/${slug}`, {
            method: "DELETE",
            headers: { Accept: "application/json", ...authHeaders() },
        });
    } catch {
        throw new Error("NETWORK");
    }
    if (!res.ok) throw new Error(toErrorCode(res.status));
}

export async function saveReport(
    payload: {
        title: string;
        slug?: string;
        category: ReportCategory;
        year?: number | null;
        description?: string;
        is_published: boolean;
        cover?: File | null;
        file?: File | null;
    },
    editSlug?: string
): Promise<ReportItem> {
    const fd = new FormData();
    fd.set("title", payload.title);
    if (payload.slug) fd.set("slug", payload.slug);
    fd.set("category", payload.category);
    if (payload.year != null) fd.set("year", String(payload.year));
    if (payload.description) fd.set("description", payload.description);
    fd.set("is_published", payload.is_published ? "1" : "0");
    if (payload.cover) fd.set("cover", payload.cover);
    if (payload.file) fd.set("file", payload.file);

    const isEdit = Boolean(editSlug);
    if (isEdit) fd.set("_method", "PUT");
    const url = isEdit ? `${API}/admin/reports/${editSlug}` : `${API}/admin/reports`;

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
    return (body as { data: ReportItem }).data;
}