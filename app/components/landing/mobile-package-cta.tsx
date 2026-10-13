"use client";

import { useEffect, useState } from "react";

/**
 * Tombol lengket di bawah layar HP. Hanya muncul setelah pengunjung
 * menggulir melewati daftar paket, supaya selalu ada jalan cepat kembali.
 */
export function MobilePackageCta({ label }: { label: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const target = document.getElementById("paket-list");
    if (!target || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setShow(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 },
    );
    io.observe(target);
    return () => io.disconnect();
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-background/90 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl transition-transform duration-300 sm:hidden ${
        show ? "translate-y-0" : "pointer-events-none translate-y-full"
      }`}
      aria-hidden={!show}
    >
      <a
        href="#paket"
        tabIndex={show ? 0 : -1}
        className="btn-accent flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm"
      >
        {label}
      </a>
    </div>
  );
}
