import type { StaffUser, StaffRole, AuditLog, Paginated } from "@/types";
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
async function parseError(res: Response): Promise<never> {
    const body = await res.json().catch(() => ({}));
    if (res.status === 422) {
        const errors = (body as { errors?: Record<string, string[]> }).errors;
        const first = errors ? Object.values(errors)[0]?.[0] : undefined;
        throw new Error(first ?? (body as { message?: string }).message ?? "Data tidak valid.");
    }
    throw new Error((body as { message?: string }).message ?? toErrorCode(res.status));
}

export async function getUsers(params: { role?: StaffRole | ""; search?: string; page?: number } = {}): Promise<Paginated<StaffUser>> {
    const qs = new URLSearchParams();
    if (params.role) qs.set("role", params.role);
    if (params.search) qs.set("search", params.search);
    if (params.page) qs.set("page", String(params.page));

    let res: Response;
    try { res = await fetch(`${API}/admin/users?${qs}`, { headers: { Accept: "application/json", ...authHeaders() }, cache: "no-store" }); }
    catch { throw new Error("NETWORK"); }
    if (!res.ok) throw new Error(toErrorCode(res.status));
    return res.json();
}

export async function createUser(payload: {
    name: string; email: string; phone: string; role: StaffRole;
    password: string; password_confirmation: string; is_active: boolean;
}): Promise<StaffUser> {
    let res: Response;
    try {
        res = await fetch(`${API}/admin/users`, {
            method: "POST",
            headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify(payload),
        });
    } catch { throw new Error("NETWORK"); }
    if (!res.ok) return parseError(res);
    return (await res.json()).data as StaffUser;
}

export async function updateUser(id: number, payload: {
    name?: string; email?: string; phone?: string; role?: StaffRole; is_active?: boolean;
}): Promise<StaffUser> {
    let res: Response;
    try {
        res = await fetch(`${API}/admin/users/${id}`, {
            method: "PUT",
            headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify(payload),
        });
    } catch { throw new Error("NETWORK"); }
    if (!res.ok) return parseError(res);
    return (await res.json()).data as StaffUser;
}

export async function deleteUser(id: number): Promise<void> {
    let res: Response;
    try { res = await fetch(`${API}/admin/users/${id}`, { method: "DELETE", headers: { Accept: "application/json", ...authHeaders() } }); }
    catch { throw new Error("NETWORK"); }
    if (!res.ok) return parseError(res);
}

export async function resetUserPassword(id: number): Promise<string> {
    let res: Response;
    try { res = await fetch(`${API}/admin/users/${id}/reset-password`, { method: "POST", headers: { Accept: "application/json", ...authHeaders() } }); }
    catch { throw new Error("NETWORK"); }
    if (!res.ok) return parseError(res);
    return (await res.json()).temporary_password as string;
}

export async function resetUserTwoFactor(id: number): Promise<void> {
    let res: Response;
    try { res = await fetch(`${API}/admin/users/${id}/reset-2fa`, { method: "POST", headers: { Accept: "application/json", ...authHeaders() } }); }
    catch { throw new Error("NETWORK"); }
    if (!res.ok) return parseError(res);
}

export async function getAuditLogs(params: { action?: string; page?: number } = {}): Promise<Paginated<AuditLog>> {
    const qs = new URLSearchParams();
    if (params.action) qs.set("action", params.action);
    if (params.page) qs.set("page", String(params.page));

    let res: Response;
    try { res = await fetch(`${API}/admin/audit-logs?${qs}`, { headers: { Accept: "application/json", ...authHeaders() }, cache: "no-store" }); }
    catch { throw new Error("NETWORK"); }
    if (!res.ok) throw new Error(toErrorCode(res.status));
    return res.json();
}