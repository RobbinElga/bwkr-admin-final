import type { NewsItem, NewsStatus, Paginated } from "@/types";
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

export interface NewsListParams {
    status?: NewsStatus | "";
    search?: string;
    page?: number;
}

export async function getNewsList(params: NewsListParams = {}): Promise<Paginated<NewsItem>> {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    if (params.search) qs.set("search", params.search);
    if (params.page) qs.set("page", String(params.page));

    let res: Response;
    try {
        res = await fetch(`${API}/admin/news?${qs}`, {
            headers: { Accept: "application/json", ...authHeaders() },
            cache: "no-store",
        });
    } catch {
        throw new Error("NETWORK");
    }
    if (!res.ok) throw new Error(toErrorCode(res.status));
    return res.json();
}

export async function deleteNews(id: number): Promise<void> {
    let res: Response;
    try {
        res = await fetch(`${API}/admin/news/${id}`, {
            method: "DELETE",
            headers: { Accept: "application/json", ...authHeaders() },
        });
    } catch {
        throw new Error("NETWORK");
    }
    if (!res.ok) throw new Error(toErrorCode(res.status));
}

export async function saveNews(
    payload: {
        title: string;
        slug?: string;
        content?: string;
        author?: string;
        category?: string;
        tags?: string[];
        meta_desc?: string;
        status: NewsStatus;
        published_at?: string;
        featured_image?: File | null;
    },
    editId?: number
): Promise<NewsItem> {
    const fd = new FormData();
    fd.set("title", payload.title);
    if (payload.slug) fd.set("slug", payload.slug);
    if (payload.content != null) fd.set("content", payload.content);
    if (payload.author) fd.set("author", payload.author);
    if (payload.category) fd.set("category", payload.category);
    (payload.tags ?? []).forEach((t) => fd.append("tags[]", t));
    if (payload.meta_desc) fd.set("meta_desc", payload.meta_desc);
    fd.set("status", payload.status);
    if (payload.published_at) fd.set("published_at", payload.published_at);
    if (payload.featured_image) fd.set("featured_image", payload.featured_image);

    const isEdit = Boolean(editId);
    if (isEdit) fd.set("_method", "PUT");
    const url = isEdit ? `${API}/admin/news/${editId}` : `${API}/admin/news`;

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
    return (body as { data: NewsItem }).data;
}

export interface NewsCategory {
    id: number;
    name: string;
    slug: string;
}

export async function getNewsCategories(): Promise<NewsCategory[]> {
    let res: Response;
    try {
        res = await fetch(`${API}/admin/news-categories`, {
            headers: { Accept: "application/json", ...authHeaders() },
            cache: "no-store",
        });
    } catch {
        throw new Error("NETWORK");
    }
    if (!res.ok) throw new Error(toErrorCode(res.status));
    return (await res.json() as { data: NewsCategory[] }).data;
}

export async function createNewsCategory(name: string): Promise<NewsCategory> {
    let res: Response;
    try {
        res = await fetch(`${API}/admin/news-categories`, {
            method: "POST",
            headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify({ name }),
        });
    } catch {
        throw new Error("NETWORK");
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
        if (res.status === 422) {
            const errors = (body as { errors?: Record<string, string[]> }).errors;
            throw new Error(errors ? Object.values(errors)[0]?.[0] ?? "Data tidak valid." : "Data tidak valid.");
        }
        throw new Error(toErrorCode(res.status));
    }
    return (body as { data: NewsCategory }).data;
}