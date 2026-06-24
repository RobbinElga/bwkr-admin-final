// app/(dashboard)/layout.tsx
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { NotificationProvider } from "@/components/notification/NotificationProvider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <NotificationProvider>
            <div className="flex min-h-screen bg-background">
                <Sidebar />
                <div className="flex flex-col flex-1 min-w-0 ml-[260px]">
                    <Topbar />
                    <main className="flex-1 p-6 mt-16 max-w-[1440px] w-full mx-auto">
                        {children}
                    </main>
                </div>
            </div>
        </NotificationProvider>
    );
}