"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminAuth } from "@/stores/auth";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type Role = "super_admin" | "admin" | "cs" | "fundraiser";

// Helper allowlist role
const ALL: Role[] = ["super_admin", "admin", "cs", "fundraiser"];
const ADMINS: Role[] = ["super_admin", "admin"];          // admin & super_admin
const SUPER: Role[] = ["super_admin"];                    // super_admin saja
const CS_KEUANGAN: Role[] = ["super_admin", "admin", "cs"]; // termasuk CS

type Child = { label: string; href: string; roles?: Role[] };
type NavItem =
    | { type: "link"; label: string; icon: string; href: string; roles?: Role[] }
    | { type: "group"; label: string; icon: string; roles?: Role[]; children: Child[] };

const navItems: NavItem[] = [
    { type: "link", label: "Dashboard", icon: "dashboard", href: "/dashboard" }, // semua
    { type: "link", label: "Program & Project", icon: "folder_managed", href: "/program", roles: ADMINS },
    {
        type: "group",
        label: "Keuangan",
        icon: "account_balance_wallet",
        roles: CS_KEUANGAN,
        children: [
            { label: "Dashboard", href: "/keuangan/dashboard", roles: ADMINS },
            { label: "Input Donasi", href: "/keuangan/input", roles: CS_KEUANGAN },
            { label: "Claim Donasi", href: "/keuangan/claim", roles: CS_KEUANGAN },
            { label: "Pengeluaran", href: "/keuangan/pengeluaran", roles: ADMINS },
            { label: "Riwayat Transaksi", href: "/keuangan/riwayat", roles: SUPER },   // CS tidak
            { label: "Rekening Bank", href: "/keuangan/rekening", roles: CS_KEUANGAN }, // CS lihat saja
        ],
    },
    { type: "link", label: "Berita", icon: "newspaper", href: "/berita", roles: ADMINS },
    { type: "link", label: "Testimoni", icon: "format_quote", href: "/testimoni", roles: ADMINS },
    { type: "link", label: "Mitra", icon: "handshake", href: "/mitra", roles: ADMINS },
    { type: "link", label: "Dampak", icon: "volunteer_activism", href: "/dampak", roles: ADMINS },
    { type: "link", label: "Pencapaian", icon: "workspace_premium", href: "/pencapaian", roles: ADMINS },
    { type: "link", label: "Laporan", icon: "assessment", href: "/laporan", roles: ADMINS },

    {
        type: "group",
        label: "CRM Donatur",
        icon: "groups",
        roles: ALL, // CS boleh
        children: [
            { label: "Daftar Donatur", href: "/crm/donors", roles: ALL },
            { label: "Broadcast WA", href: "/crm/broadcast", roles: ALL },
            { label: "Template Pesan", href: "/crm/templates", roles: ALL },
        ],
    },
    { type: "link", label: "Manajemen User", icon: "manage_accounts", href: "/users", roles: SUPER },
    { type: "link", label: "Audit Log", icon: "history", href: "/audit-logs", roles: SUPER },
    { type: "link", label: "Sampah", icon: "delete", href: "/sampah", roles: SUPER },
    { type: "link", label: "Pengaturan Situs", icon: "settings", href: "/pengaturan", roles: ADMINS },
];

export function Sidebar() {
    const pathname = usePathname();
    const { logout, user } = useAdminAuth();
    const role = (user?.role ?? "cs") as Role;

    const canAccess = (roles?: Role[]) => !roles || roles.includes(role);

    // Filter item + sub-item sesuai role
    const visibleItems = navItems
        .filter((item) => canAccess(item.roles))
        .map((item) =>
            item.type === "group"
                ? { ...item, children: item.children.filter((c) => canAccess(c.roles)) }
                : item
        )
        .filter((item) => item.type !== "group" || item.children.length > 0);

    // Buka grup otomatis kalau sedang di dalamnya
    const initialGroup =
        pathname.startsWith("/keuangan") ? "Keuangan" : pathname.startsWith("/crm") ? "CRM Donatur" : null;
    const [openGroup, setOpenGroup] = useState<string | null>(initialGroup);

    function isActive(href: string) {
        if (href === "/dashboard") return pathname === "/dashboard";
        return pathname.startsWith(href);
    }

    return (
        <aside className="w-[260px] h-screen fixed left-0 top-0 z-50 flex flex-col bg-[var(--color-sidebar-bg)] border-r border-outline-variant/20">
            {/* Brand */}
            <div className="px-6 py-5 border-b border-white/10">
                <h1 className="text-lg font-bold text-white">BWKR Admin</h1>
                <p className="text-xs text-[var(--color-sidebar-text)] opacity-70 mt-0.5">Wakaf Stewardship</p>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-3">
                <ul className="flex flex-col gap-0.5 px-2">
                    {visibleItems.map((item) => {
                        if (item.type === "link") {
                            const active = isActive(item.href);
                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                                            active
                                                ? "bg-[var(--color-sidebar-active-bg)] text-[var(--color-sidebar-active-text)] font-semibold"
                                                : "text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-hover-bg)]"
                                        )}
                                    >
                                        <Icon name={item.icon} filled={active} className="text-[20px]" />
                                        {item.label}
                                    </Link>
                                </li>
                            );
                        }

                        const groupActive = item.children.some((c) => pathname.startsWith(c.href));
                        const isOpen = openGroup === item.label;

                        return (
                            <li key={item.label}>
                                <button
                                    onClick={() => setOpenGroup(isOpen ? null : item.label)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                                        groupActive
                                            ? "text-[var(--color-sidebar-active-text)] font-semibold"
                                            : "text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-hover-bg)]"
                                    )}
                                >
                                    <Icon name={item.icon} filled={groupActive} className="text-[20px]" />
                                    <span className="flex-1 text-left">{item.label}</span>
                                    <Icon name="expand_more" className={cn("text-[18px] transition-transform duration-200", isOpen && "rotate-180")} />
                                </button>

                                <div className={cn("overflow-hidden transition-all duration-200", isOpen ? "max-h-60 opacity-100" : "max-h-0 opacity-0")}>
                                    <ul className="flex flex-col gap-0.5 pl-9 pr-2 pb-1">
                                        {item.children.map((child) => {
                                            const childActive = pathname.startsWith(child.href);
                                            return (
                                                <li key={child.href}>
                                                    <Link
                                                        href={child.href}
                                                        className={cn(
                                                            "block px-3 py-2 rounded-lg text-sm transition-colors",
                                                            childActive
                                                                ? "bg-[var(--color-sidebar-active-bg)] text-[var(--color-sidebar-active-text)] font-semibold"
                                                                : "text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-hover-bg)]"
                                                        )}
                                                    >
                                                        {child.label}
                                                    </Link>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Footer */}
            <div className="border-t border-white/10 p-3">
                <button
                    onClick={() => logout()}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--color-sidebar-text)] hover:bg-error/20 hover:text-error transition-colors"
                >
                    <Icon name="logout" className="text-[20px]" />
                    Keluar
                </button>
            </div>
        </aside>
    );
}