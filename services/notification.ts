import type { AppNotification, Paginated } from "@/types";
import { getToken } from "@/services/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

function authHeaders(): HeadersInit {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface NotificationListResponse extends Paginated<AppNotification> {
    unread_count: number;
}

export async function getNotifications(): Promise<NotificationListResponse> {
    const res = await fetch(`${API}/admin/notifications`, {
        headers: { Accept: "application/json", ...authHeaders() },
        cache: "no-store",
    });
    if (!res.ok) throw new Error("SERVER");
    return res.json();
}

export async function markRead(id: number): Promise<void> {
    await fetch(`${API}/admin/notifications/${id}/read`, {
        method: "POST",
        headers: { Accept: "application/json", ...authHeaders() },
    });
}

export async function markAllRead(): Promise<void> {
    await fetch(`${API}/admin/notifications/read-all`, {
        method: "POST",
        headers: { Accept: "application/json", ...authHeaders() },
    });
}