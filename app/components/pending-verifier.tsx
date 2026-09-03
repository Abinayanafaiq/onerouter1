"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { triggerWalletRefresh } from "@/app/components/credit-badge";

/**
 * Housekeeping order Pakasir PENDING.
 *
 * Approval order bisa lewat webhook, tapi komponen ini memanggil endpoint
 * verify-pending untuk mengecek status langsung ke API Pakasir
 * (transactiondetail), saat:
 *   - mount (halaman dashboard pertama kali dibuka / redirect balik dari Pakasir)
 *   - window focus (user kembali ke tab ini)
 *   - setiap 15 detik
 *
 * Jika ada perubahan (approved/cancelled), trigger wallet refresh +
 * router refresh agar UI langsung sinkron.
 */
export function PakasirPendingVerifier() {
  const router = useRouter();
  const lastRunRef = useRef(0);

  useEffect(() => {
    let active = true;

    async function verify() {
      const now = Date.now();
      if (now - lastRunRef.current < 4000) return;
      lastRunRef.current = now;
      try {
        const res = await fetch("/api/orders/pakasir/verify-pending", {
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
