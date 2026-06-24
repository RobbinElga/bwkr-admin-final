// components/auth/AdminAuthProvider.tsx
"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAdminAuth } from "@/stores/auth";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

// Halaman yang boleh diakses TANPA token penuh
const PUBLIC_PATHS = ["/", "/masuk-sisem-ini", "/2fa/setup", "/2fa/backup"];

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
    const { hydrate, status } = useAdminAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        hydrate();
    }, [hydrate]);

    useEffect(() => {
        const isPublic = PUBLIC_PATHS.includes(pathname);

        // Belum login & coba buka halaman terlindungi → ke /login
        if (status === "guest" && !isPublic) {
            router.replace("/masuk-sistem-ini");
        }
        // Sudah login tapi malah buka /login → ke /dashboard
        if (status === "authenticated" && pathname === "/masuk-sistem-ini") {
            router.replace("/dashboard");
        }
    }, [status, pathname, router]);

    if (status === "loading") {
        return <LoadingScreen />;
    }

    return <div className="bwkr-app-reveal">{children}</div>;
}