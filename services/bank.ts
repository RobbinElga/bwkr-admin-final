import type { BankAccount } from "@/types";
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

export async function getAdminBankAccounts(): Promise<BankAccount[]> {
    let res: Response;
    try {
        res = await fetch(`${API}/admin/bank-accounts`, {
            headers: { Accept: "application/json", ...authHeaders() },
            cache: "no-store",
        });
    } catch {
        throw new Error("NETWORK");
    }
    if (!res.ok) throw new Error(toErrorCode(res.status));
    const body = await res.json();
    return (body as { data: BankAccount[] }).data;
}

export async function saveBankAccount(
    payload: {
        type: "bank" | "qris";
        bank_name: string;
        account_number?: string;
        account_name?: string;
        initial_balance?: number;
        is_active: boolean;
        logo?: File | null;
        qris_image?: File | null;
    },
    editId?: number
): Promise<BankAccount> {
    const fd = new FormData();
    fd.set("type", payload.type);
    fd.set("bank_name", payload.bank_name);
    if (payload.account_number) fd.set("account_number", payload.account_number);
    if (payload.account_name) fd.set("account_name", payload.account_name);
    fd.set("initial_balance", String(payload.initial_balance ?? 0));
    fd.set("is_active", payload.is_active ? "1" : "0");
    if (payload.logo) fd.set("logo", payload.logo);
    if (payload.qris_image) fd.set("qris_image", payload.qris_image);

    const isEdit = Boolean(editId);
    if (isEdit) fd.set("_method", "PUT");
    const url = isEdit ? `${API}/admin/bank-accounts/${editId}` : `${API}/admin/bank-accounts`;

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
    return (body as { data: BankAccount }).data;
}

export async function deleteBankAccount(id: number): Promise<void> {
    let res: Response;
    try {
        res = await fetch(`${API}/admin/bank-accounts/${id}`, {
            method: "DELETE",
            headers: { Accept: "application/json", ...authHeaders() },
        });
    } catch {
        throw new Error("NETWORK");
    }
    if (!res.ok) throw new Error(toErrorCode(res.status));
}