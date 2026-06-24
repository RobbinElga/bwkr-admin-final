export function friendlyError(code: string): string {
    switch (code) {
        case "NETWORK": return "Tidak dapat terhubung ke server. Periksa koneksi Anda.";
        case "UNAUTHORIZED": return "Sesi berakhir. Silakan login kembali.";
        case "VALIDATION": return "Data tidak valid.";
        case "SERVER":
        default: return "Terjadi kesalahan. Silakan coba lagi.";
    }
}