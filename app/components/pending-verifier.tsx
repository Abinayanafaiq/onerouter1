"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { triggerWalletRefresh } from "@/app/components/credit-badge";

// Endpoint Pakasir (legacy) tetap dipanggil agar order Pakasir yang masih
// PENDING saat gateway dipindah ke Sumopod tetap ter-approve via cek status API.
const VERIFY_ENDPOINTS = [
  "/api/orders/sumopod/verify-pending",
  "/api/orders/pakasir/verify-pending",
];

/**
 * Housekeeping order Sumopod PENDING.
 *
 * API Sumopod tidak punya endpoint cek status — approval order sepenuhnya
 * lewat webhook. Komponen ini memanggil endpoint verify-pending untuk
 * membatalkan order yang payment link-nya sudah expired, saat:
 *   - mount (halaman dashboard pertama kali dibuka / redirect balik dari Sumopod)
 *   - window focus (user kembali ke tab ini)
 *   - setiap 15 detik
 *
 * Jika ada perubahan (approved/cancelled), trigger wallet refresh +
 * router refresh agar UI langsung sinkron.
 */
export function SumopodPendingVerifier() {
  const router = useRouter();
  const lastRunRef = useRef(0);

  useEffect(() => {
    let active = true;

    async function verify() {
      const now = Date.now();
      if (now - lastRunRef.current < 4000) return;
      lastRunRef.current = now;
      let changed = false;
      // Berurutan (bukan paralel) agar tidak membebani connection pool DB.
      for (const endpoint of VERIFY_ENDPOINTS) {
        try {
          const res = await fetch(endpoint, { cache: "no-store" });
          if (!active) return;
          if (!res.ok) continue;
          const data = (await res.json()) as {
            success: boolean;
            approved?: number;
            cancelled?: number;
          };
          if (data.success && ((data.approved || 0) > 0 || (data.cancelled || 0) > 0)) {
            changed = true;
          }
        } catch {
          // ignore transient errors
        }
      }
      if (active && changed) {
        triggerWalletRefresh();
        router.refresh();
      }
    }

    verify();
    const onFocus = () => verify();
    window.addEventListener("focus", onFocus);
    // Lewati tab di background; focus memicu verify saat user kembali.
    const interval = setInterval(() => {
      if (!document.hidden) verify();
    }, 15000);

    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
      clearInterval(interval);
    };
  }, [router]);

  return null;
}
