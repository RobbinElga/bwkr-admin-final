import type { DonationInput, DonationSource, DonationStatus, BankAccount, Paginated } from "@/types";
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

export interface DonationInputListParams {
    status?: DonationStatus | "";
    source?: DonationSource | "";
    search?: string;
    page?: number;
}

export async function getDonationInputs(params: DonationInputListParams = {}): Promise<Paginated<DonationInput>> {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    if (params.source) qs.set("source", params.source);
    if (params.search) qs.set("search", params.search);
    if (params.page) qs.set("page", String(params.page));

    let res: Response;
    try {
        res = await fetch(`${API}/admin/donations-input?${qs}`, {
            headers: { Accept: "application/json", ...authHeaders() },
            cache: "no-store",
        });
    } catch {
        throw new Error("NETWORK");
    }
    if (!res.ok) throw new Error(toErrorCode(res.status));
    return res.json();
}

/** Daftar rekening (endpoint publik — dipakai untuk dropdown form). */
export async function getBankAccounts(): Promise<BankAccount[]> {
    let res: Response;
    try {
        res = await fetch(`${API}/bank-accounts`, {
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

export async function createDonationInput(payload: {
    donor_name: string;
    salutation?: string;
    donor_alias?: string;
    donor_phone: string;
    donor_email?: string;
    amount: number;
    bank_account_id?: number;
    on_behalf?: string;
    message?: string;
    proof?: File | null;
}): Promise<DonationInput> {
    const fd = new FormData();
    fd.set("donor_name", payload.donor_name);
    if (payload.salutation) fd.set("salutation", payload.salutation);
    if (payload.donor_alias) fd.set("donor_alias", payload.donor_alias);
    fd.set("donor_phone", payload.donor_phone);
    if (payload.donor_email) fd.set("donor_email", payload.donor_email);
    fd.set("amount", String(payload.amount));
    if (payload.bank_account_id) fd.set("bank_account_id", String(payload.bank_account_id));
    if (payload.on_behalf) fd.set("on_behalf", payload.on_behalf);
    if (payload.message) fd.set("message", payload.message);
    if (payload.proof) fd.set("proof", payload.proof);

    let res: Response;
    try {
        res = await fetch(`${API}/admin/donations-input`, {
            method: "POST",
            headers: { Accept: "application/json", ...authHeaders() },
            body: fd,
        });
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
    return (body as { data: DonationInput }).data;
}