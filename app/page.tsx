"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();
  const glowRef = useRef<HTMLDivElement>(null);

  // glow ikut gerak mouse (update style langsung, tanpa re-render)
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      if (glowRef.current) {
        glowRef.current.style.background =
          `radial-gradient(circle at ${x}% ${y}%, #8bd6b6 0%, transparent 70%)`;
      }
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <main className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden bg-[#004532] px-6">
      <div
        ref={glowRef}
        className="pointer-events-none fixed inset-0 opacity-20"
        style={{ background: "radial-gradient(circle at 50% 50%, #8bd6b6 0%, transparent 60%)" }}
      />
      <h1 className="bwkr-fade-in relative z-10 select-none text-center text-[32px] font-bold leading-[40px] tracking-[-0.03em] text-[#a6f2d1]">
        Selamat Datang
      </h1>
    </main>
  );
}