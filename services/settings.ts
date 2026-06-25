import type { SettingGroup } from "@/types";
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

export async function getSettings(): Promise<SettingGroup[]> {
    const res = await fetch(`${API}/admin/settings`, {
        headers: { Accept: "application/json", ...authHeaders() },
        cache: "no-store",
    });
    if (!res.ok) throw new Error(toErrorCode(res.status));
    const body = await res.json();
    return body.data as SettingGroup[];
}

export async function saveSettings(fd: FormData): Promise<void> {
    const res = await fetch(`${API}/admin/settings`, {
        method: "POST",
        headers: { Accept: "application/json", ...authHeaders() },
        body: fd,
    });
    if (!res.ok) throw new Error(toErrorCode(res.status));
}

export interface WhatsappSettings {
    wa_enabled: boolean;
    wa_api_key_set: boolean;
}

export async function getWhatsappSettings(): Promise<WhatsappSettings> {
    const res = await fetch(`${API}/admin/whatsapp-settings`, {
        headers: { Accept: "application/json", ...authHeaders() },
        cache: "no-store",
    });
    if (!res.ok) throw new Error(toErrorCode(res.status));
    return res.json();
}

export async function saveWhatsappSettings(payload: { wa_api_key?: string; wa_enabled?: boolean }): Promise<void> {
    const res = await fetch(`${API}/admin/whatsapp-settings`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(toErrorCode(res.status));
}