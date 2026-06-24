import type { Expense, ExpenseStatus, Paginated, Project } from "@/types";
import { getToken } from "@/services/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

function authHeaders(): HeadersInit {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}
function toErrorCode(status: number): string {
    if (status === 401 || status === 403) return "UNAUTHORIZED";
    return "SERVER";
}

export async function getExpenses(params: { project_id?: number; status?: ExpenseStatus | "" } = {}): Promise<Expense[]> {
    const qs = new URLSearchParams();
    if (params.project_id) qs.set("project_id", String(params.project_id));
    if (params.status) qs.set("status", params.status);
    qs.set("per_page", "100");

    let res: Response;
    try {
        res = await fetch(`${API}/admin/expenses?${qs}`, {
            headers: { Accept: "application/json", ...authHeaders() },
            cache: "no-store",
        });
    } catch {
        throw new Error("NETWORK");
    }
    if (!res.ok) throw new Error(toErrorCode(res.status));
    const body = await res.json();
    return (body as Paginated<Expense>).data;
}

async function postJson(url: string, body?: object): Promise<Response> {
    try {
        return await fetch(url, {
            method: "POST",
            headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
            body: body ? JSON.stringify(body) : undefined,
        });
    } catch {
        throw new Error("NETWORK");
    }
}

export async function approveExpense(id: number): Promise<void> {
    const res = await postJson(`${API}/admin/expenses/${id}/approve`);
    if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        if (res.status === 422) throw new Error((b as { message?: string }).message ?? "Tidak bisa disetujui.");
        throw new Error(toErrorCode(res.status));
    }
}

export async function rejectExpense(id: number, notes?: string): Promise<void> {
    const res = await postJson(`${API}/admin/expenses/${id}/reject`, { notes });
    if (!res.ok) throw new Error(toErrorCode(res.status));
}

export async function getExpenseFile(id: number, type: "receipt" | "ttd" | "materai"): Promise<string> {
    let res: Response;
    try {
        res = await fetch(`${API}/admin/expenses/${id}/file/${type}`, { headers: { ...authHeaders() } });
    } catch {
        throw new Error("NETWORK");
    }
    if (!res.ok) throw new Error(toErrorCode(res.status));
    return URL.createObjectURL(await res.blob());
}

export async function getExpenseProjects(): Promise<Project[]> {
    let res: Response;
    try {
        res = await fetch(`${API}/admin/projects?per_page=200`, {
            headers: { Accept: "application/json", ...authHeaders() },
            cache: "no-store",
        });
    } catch {
        throw new Error("NETWORK");
    }
    if (!res.ok) throw new Error(toErrorCode(res.status));
    const body = await res.json();
    return (body as Paginated<Project>).data ?? [];
}

export async function createExpense(payload: {
    project_id: number;
    amount: number;
    bank_account_id?: number;
    notes?: string;
    receipt_file: File;
    ttd_file?: File | null;
    materai_file?: File | null;
}): Promise<Expense> {
    const fd = new FormData();
    fd.set("project_id", String(payload.project_id));
    fd.set("amount", String(payload.amount));
    if (payload.bank_account_id) fd.set("bank_account_id", String(payload.bank_account_id));
    if (payload.notes) fd.set("notes", payload.notes);
    fd.set("receipt_file", payload.receipt_file);
    if (payload.ttd_file) fd.set("ttd_file", payload.ttd_file);
    if (payload.materai_file) fd.set("materai_file", payload.materai_file);

    let res: Response;
    try {
        res = await fetch(`${API}/admin/expenses`, { method: "POST", headers: { Accept: "application/json", ...authHeaders() }, body: fd });
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
    return (body as { data: Expense }).data;
}

export async function deleteExpense(id: number): Promise<void> {
    let res: Response;
    try {
        res = await fetch(`${API}/admin/expenses/${id}`, {
            method: "DELETE",
            headers: { Accept: "application/json", ...authHeaders() },
        });
    } catch { throw new Error("NETWORK"); }
    if (!res.ok) throw new Error(toErrorCode(res.status));
}