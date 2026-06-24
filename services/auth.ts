const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const TOKEN_KEY = "bwkr_admin_token";

export function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string) { localStorage.setItem(TOKEN_KEY, t); }
export function clearToken() { localStorage.removeItem(TOKEN_KEY); }

async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
    const token = getToken();
    const res = await fetch(`${API}${path}`, {
        ...opts,
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(opts.headers ?? {}),
        },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
        const errs = (body as { errors?: Record<string, string[]> }).errors;
        const first = errs ? Object.values(errs)[0]?.[0] : undefined;
        throw new Error((body as { message?: string }).message ?? first ?? "Terjadi kesalahan.");
    }
    return body as T;
}

type LoginStep1 =
    | { status: "2fa_setup_required"; setup_token: string; message: string }
    | { status: "2fa_required"; challenge_token: string; message: string };

export async function loginStaff(email: string, password: string): Promise<LoginStep1> {
    return api<LoginStep1>("/auth/masuk-sistem", {
        method: "POST",
        body: JSON.stringify({ email, password }),
    });
}

type LoginFinal = {
    token: string;
    expires_at: string;
    user: import("@/types").StaffUser;
    backup_codes?: string[];
};

export async function verifyTwoFactor(challengeToken: string, code: string): Promise<LoginFinal> {
    const res = await fetch(`${API}/auth/masuk-sistem/2fa`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${challengeToken}` },
        body: JSON.stringify({ code }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((body as { message?: string }).message ?? "Kode 2FA tidak valid.");
    return body as LoginFinal;
}

type SetupData = {
    secret: string;
    otpauth_url: string;
    qr_svg: string;
};

export async function setup2FA(setupToken: string): Promise<SetupData> {
    const res = await fetch(`${API}/auth/2fa/setup`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${setupToken}` },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error((body as { message?: string }).message ?? "Gagal memuat setup 2FA.");
    }
    return body as SetupData;
}

export async function enable2FA(setupToken: string, code: string): Promise<LoginFinal> {
    const res = await fetch(`${API}/auth/2fa/enable`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${setupToken}` },
        body: JSON.stringify({ code }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((body as { message?: string }).message ?? "Kode 2FA tidak valid.");
    return body as LoginFinal;
}

export async function getMe(): Promise<import("@/types").StaffUser> {
    return api<import("@/types").StaffUser>("/auth/me");
}

export async function logoutStaff(): Promise<void> {
    await api("/auth/logout", { method: "POST" });
}

// Simpan setup_token sementara di sessionStorage (hilang saat tab ditutup)
export function getSetupToken() { return sessionStorage.getItem("bwkr_setup_token"); }
export function setSetupToken(t: string) { sessionStorage.setItem("bwkr_setup_token", t); }
export function clearSetupToken() { sessionStorage.removeItem("bwkr_setup_token"); }