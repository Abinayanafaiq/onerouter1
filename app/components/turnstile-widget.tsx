"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback?: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          appearance?: "always" | "execute" | "interaction-only";
        },
      ) => string;
      reset: (id?: string) => void;
      remove: (id: string) => void;
    };
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/**
 * Widget Cloudflare Turnstile. Me-render token ke hidden input
 * name="cf-turnstile-response" sehingga otomatis terbawa saat form di-submit
 * via server action (FormData). Memakai explicit render agar bisa reset ulang
 * setelah submit gagal.
 *
 * Jika NEXT_PUBLIC_TURNSTILE_SITE_KEY kosong, widget tidak di-render (mode dev).
 */
export function TurnstileWidget({
  onVerified,
  className = "",
}: {
  onVerified?: (token: string) => void;
  className?: string;
}) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (!siteKey || !scriptLoaded || !containerRef.current) return;
    if (widgetIdRef.current) return;
    if (!window.turnstile) return;

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      appearance: "always",
      callback: (token: string) => {
        setErrored(false);
        onVerified?.(token);
      },
      "error-callback": () => {
        setErrored(true);
        onVerified?.("");
      },
      "expired-callback": () => {
        onVerified?.("");
      },
    });

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, scriptLoaded, onVerified]);

  // Reset widget saat token perlu di-refresh (dipanggil parent via ref/event).
  useEffect(() => {
    function onReset() {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
    }
    window.addEventListener("turnstile:reset", onReset);
    return () => window.removeEventListener("turnstile:reset", onReset);
  }, []);

  if (!siteKey) return null;

  return (
    <div className={className}>
      <Script
        src={SCRIPT_SRC}
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
        onError={() => setErrored(true)}
      />
      <div ref={containerRef} className="min-h-[65px]" />
      {errored && (
        <p className="text-xs text-red-600 mt-1">
          Verifikasi keamanan gagal dimuat. Muat ulang halaman lalu coba lagi.
        </p>
      )}
    </div>
  );
}
