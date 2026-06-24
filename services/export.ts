import { getToken } from "@/services/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export async function downloadExport(
    path: string, // mis. "donations-input/export"
    params: Record<string, string | number | undefined>,
    format: "excel" | "pdf",
    name: string, // nama file tanpa ekstensi, mis. "laporan-donasi"
) {
    const token = getToken();
    const qs = new URLSearchParams();
    qs.set("format", format);
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    });

    const res = await fetch(`${API}/admin/${path}?${qs.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error("Gagal mengunduh file. Coba lagi.");

    const blob = await res.blob();
    const ext = format === "pdf" ? "pdf" : "xlsx";

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}