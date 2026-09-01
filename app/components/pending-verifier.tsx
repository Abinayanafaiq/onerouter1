"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { triggerWalletRefresh } from "@/app/components/credit-badge";

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
      try {
        const res = await fetch("/api/orders/sumopod/verify-pending", {
          cache: "no-store",
        });
        if (!active || !res.ok) return;
        const data = (await res.json()) as {
          success: boolean;
          approved?: number;
          cancelled?: number;
        };
        if (data.success && ((data.approved || 0) > 0 || (data.cancelled || 0) > 0)) {
          triggerWalletRefresh();
          router.refresh();
        }
      } catch {
        // ignore transient errors
      }
    }

    verify();
    const onFocus = () => verify();
    window.addEventListener("focus", onFocus);
    const interval = setInterval(verify, 15000);

    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
      clearInterval(interval);
    };
  }, [router]);

  return null;
}
