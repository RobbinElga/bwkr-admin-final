// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { AdminAuthProvider } from "@/components/auth/AdminAuthProvider";

export const metadata: Metadata = {
  title: "BWKR Admin",
  description: "Panel Admin BWKR Wakaf Management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AdminAuthProvider>{children}</AdminAuthProvider>
      </body>
    </html>
  );
}