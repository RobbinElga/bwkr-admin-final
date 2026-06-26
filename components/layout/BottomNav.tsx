"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

const items = [
    { label: "Dashboard", icon: "dashboard", href: "/dashboard" },
    { label: "Donasi", icon: "account_balance_wallet", href: "/keuangan/input" },
    { label: "Donatur", icon: "groups", href: "/crm/donors" },
];

export function BottomNav({ onMore }: { onMore: () => void }) {
    const pathname = usePathname();
    const isActive = (href: string) =>
        href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 flex items-stretch border-t border-outline-variant bg-surface-container-lowest">
            {items.map((it) => (
                <Link key={it.href} href={it.href}
                    className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors ${isActive(it.href) ? "text-primary" : "text-on-surface-variant"}`}>
                    <Icon name={it.icon} filled={isActive(it.href)} className="text-[22px]" />
                    {it.label}
                </Link>
            ))}
            <button onClick={onMore}
                className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] text-on-surface-variant transition-colors hover:text-primary">
                <Icon name="menu" className="text-[22px]" />
                Menu
            </button>
        </nav>
    );
}