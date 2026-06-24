import type { Project, ProjectStatus, ProjectStats, ProjectUpdate, Paginated, ProjectDonor } from "@/types";
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

export interface ProjectListParams {
    program_id?: number;
    search?: string;
    status?: ProjectStatus | "";
    per_page?: number;
}

export async function getProjects(params: ProjectListParams = {}): Promise<Paginated<Project>> {
    const qs = new URLSearchParams();
    if (params.program_id) qs.set("program_id", String(params.program_id));
    if (params.search) qs.set("search", params.search);
    if (params.status) qs.set("status", params.status);
    qs.set("per_page", String(params.per_page ?? 100)); // ambil banyak; proyek per program biasanya sedikit

    let res: Response;
    try {
        res = await fetch(`${API}/admin/projects?${qs}`, {
            headers: { Accept: "application/json", ...authHeaders() },
            cache: "no-store",
        });
    } catch {
        throw new Error("NETWORK");
    }
    if (!res.ok) throw new Error(toErrorCode(res.status));
    return res.json();
}

export async function saveProject(
    payload: {
        program_id: number;
        name: string;
        slug?: string;
        description?: string;
        start_date?: string;
        end_date?: string;
        target_amount?: number;
        status?: ProjectStatus;
        images?: File[];
        bank_account_ids?: number[];
    },
    editSlug?: string
): Promise<Project> {
    const fd = new FormData();
    fd.set("program_id", String(payload.program_id));
    fd.set("name", payload.name);
    if (payload.slug) fd.set("slug", payload.slug);
    if (payload.description != null) fd.set("description", payload.description);
    if (payload.start_date) fd.set("start_date", payload.start_date);
    if (payload.end_date) fd.set("end_date", payload.end_date);
    if (payload.target_amount != null) fd.set("target_amount", String(payload.target_amount));
    if (payload.status) fd.set("status", payload.status);
    (payload.images ?? []).forEach((f) => fd.append("images[]", f));
    (payload.bank_account_ids ?? []).forEach((id) => fd.append("bank_account_ids[]", String(id)));

    const isUpdate = Boolean(editSlug);
    if (isUpdate) fd.set("_method", "PUT");
    const url = isUpdate ? `${API}/admin/projects/${editSlug}` : `${API}/admin/projects`;

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
    return (body as { data: Project }).data;
}

export async function deleteProject(slug: string): Promise<void> {
    let res: Response;
    try {
        res = await fetch(`${API}/admin/projects/${slug}`, {
            method: "DELETE",
            headers: { Accept: "application/json", ...authHeaders() },
        });
    } catch {
        throw new Error("NETWORK");
    }
    if (!res.ok) throw new Error(toErrorCode(res.status));
}

export async function getProject(slug: string): Promise<Project> {
    let res: Response;
    try {
        res = await fetch(`${API}/admin/projects/${slug}`, {
            headers: { Accept: "application/json", ...authHeaders() },
            cache: "no-store",
        });
    } catch {
        throw new Error("NETWORK");
    }
    if (!res.ok) throw new Error(toErrorCode(res.status));
    const body = await res.json();
    return (body as { data: Project }).data;
}

export async function getProjectStats(slug: string): Promise<ProjectStats> {
    let res: Response;
    try {
        res = await fetch(`${API}/admin/projects/${slug}/stats`, {
            headers: { Accept: "application/json", ...authHeaders() },
            cache: "no-store",
        });
    } catch {
        throw new Error("NETWORK");
    }
    if (!res.ok) throw new Error(toErrorCode(res.status));
    return res.json();
}

export async function getProjectUpdates(slug: string): Promise<ProjectUpdate[]> {
    let res: Response;
    try {
        res = await fetch(`${API}/admin/projects/${slug}/updates?per_page=50`, {
            headers: { Accept: "application/json", ...authHeaders() },
            cache: "no-store",
        });
    } catch {
        throw new Error("NETWORK");
    }
    if (!res.ok) throw new Error(toErrorCode(res.status));
    const body = await res.json();
    const list = (body as { data: ProjectUpdate[] }).data ?? [];
    // urutkan terbaru dulu
    return list.sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""));
}

export async function saveProjectUpdate(
    projectSlug: string,
    payload: {
        title: string;
        content?: string;
        published_at?: string;
        images?: File[];
    },
    editId?: number
): Promise<ProjectUpdate> {
    const fd = new FormData();
    fd.set("title", payload.title);
    if (payload.content != null) fd.set("content", payload.content);
    if (payload.published_at) fd.set("published_at", payload.published_at);
    (payload.images ?? []).forEach((f) => fd.append("images[]", f));

    const isEdit = Boolean(editId);
    if (isEdit) fd.set("_method", "PUT");
    const url = isEdit
        ? `${API}/admin/projects/${projectSlug}/updates/${editId}`
        : `${API}/admin/projects/${projectSlug}/updates`;

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
    return (body as { data: ProjectUpdate }).data;
}

export async function deleteProjectUpdate(projectSlug: string, id: number): Promise<void> {
    let res: Response;
    try {
        res = await fetch(`${API}/admin/projects/${projectSlug}/updates/${id}`, {
            method: "DELETE",
            headers: { Accept: "application/json", ...authHeaders() },
        });
    } catch {
        throw new Error("NETWORK");
    }
    if (!res.ok) throw new Error(toErrorCode(res.status));
}

export async function getProjectDonors(slug: string): Promise<ProjectDonor[]> {
    let res: Response;
    try {
        res = await fetch(`${API}/admin/projects/${slug}/donors`, {
            headers: { Accept: "application/json", ...authHeaders() },
            cache: "no-store",
        });
    } catch {
        throw new Error("NETWORK");
    }
    if (!res.ok) throw new Error(toErrorCode(res.status));
    const body = await res.json();
    return (body as { data: ProjectDonor[] }).data;
}

export async function getTrashedProjects(): Promise<Project[]> {
    let res: Response;
    try {
        res = await fetch(`${API}/admin/projects/trashed`, { headers: { Accept: "application/json", ...authHeaders() }, cache: "no-store" });
    } catch { throw new Error("NETWORK"); }
    if (!res.ok) throw new Error(toErrorCode(res.status));
    return (await res.json() as { data: Project[] }).data;
}

export async function restoreProject(id: number): Promise<void> {
    let res: Response;
    try {
        res = await fetch(`${API}/admin/projects/${id}/restore`, { method: "POST", headers: { Accept: "application/json", ...authHeaders() } });
    } catch { throw new Error("NETWORK"); }
    if (!res.ok) throw new Error(toErrorCode(res.status));
}

export async function forceDeleteProject(id: number): Promise<void> {
    let res: Response;
    try {
        res = await fetch(`${API}/admin/projects/${id}/force`, { method: "DELETE", headers: { Accept: "application/json", ...authHeaders() } });
    } catch { throw new Error("NETWORK"); }
    if (!res.ok) throw new Error(toErrorCode(res.status));
}
