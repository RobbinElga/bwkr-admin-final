import { getToken } from "@/services/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function adminGet<T>(path: string): Promise<T> {
    const token = getToken();
    let res: Response;
    try {
        res = await fetch(`${API}${path}`, {
            headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            cache: "no-store",
        });
    } catch {
        throw new Error("NETWORK");
    }
    if (res.status === 401 || res.status === 403) throw new Error("UNAUTHORIZED");
    if (!res.ok) throw new Error("SERVER");
    return res.json() as Promise<T>;
}

export interface RingkasanKas { total_masuk: number; total_keluar: number; saldo: number; }
export interface TrenBulan { bulan: string; masuk: number; keluar: number; }
export interface ProgramTotal { id: number; nama: string; total: number; }
export interface KategoriTotal { kategori: string; total: number; }
export interface KeuanganDashboard {
    ringkasan: RingkasanKas;
    tren: TrenBulan[];
    per_program: ProgramTotal[];
    per_kategori: KategoriTotal[];
}

export async function getKeuanganDashboard(): Promise<KeuanganDashboard> {
    return adminGet<KeuanganDashboard>("/admin/keuangan/dashboard");
}