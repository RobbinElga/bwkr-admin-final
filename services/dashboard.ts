import type { DashboardStats, DonationTrendPoint, RecentDonation } from "@/types";
import { getToken } from "@/services/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

/** GET ber-token. Hanya melempar KODE error generik — tak membocorkan pesan server. */
async function adminGet<T>(path: string): Promise<T> {
    const token = getToken();
    let res: Response;
    try {
        res = await fetch(`${API}${path}`, {
            headers: {
                Accept: "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            cache: "no-store",
        });
    } catch {
        throw new Error("NETWORK");
    }
    if (res.status === 401 || res.status === 403) throw new Error("UNAUTHORIZED");
    if (!res.ok) throw new Error("SERVER");
    return res.json() as Promise<T>;
}

export async function getDashboardStats(): Promise<DashboardStats> {
    return adminGet<DashboardStats>("/admin/dashboard");
}

export async function getDonationTrends(months = 12): Promise<DonationTrendPoint[]> {
    const body = await adminGet<{ data: DonationTrendPoint[] }>(`/admin/dashboard/trends?months=${months}`);
    return body.data;
}

export async function getRecentDonations(limit = 5): Promise<RecentDonation[]> {
    const body = await adminGet<{ data: RecentDonation[] }>(`/admin/dashboard/recent-donations?limit=${limit}`);
    return body.data;
}