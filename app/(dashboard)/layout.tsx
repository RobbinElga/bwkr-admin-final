"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { NotificationProvider } from "@/components/notification/NotificationProvider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [navOpen, setNavOpen] = useState(false);

    return (
        <NotificationProvider>
            <div className="flex min-h-screen bg-background">
                <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
                <div className="flex flex-col flex-1 min-w-0 lg:ml-[260px]">
                    <Topbar onMenu={() => setNavOpen(true)} />
                    <main className="flex-1 p-4 sm:p-6 mt-16 pb-24 lg:pb-6 max-w-[1440px] w-full mx-auto">
                        {children}
                    </main>
                </div>
                <BottomNav onMore={() => setNavOpen(true)} />
            </div>
        </NotificationProvider>
    );
}