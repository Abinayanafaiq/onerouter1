"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
const LOAD_TIMEOUT_MS = 12_000;
const POLL_INTERVAL_MS = 100;

/**
 * Widget Cloudflare Turnstile. Me-render token ke hidden input
 * name="cf-turnstile-response" sehingga otomatis terbawa saat form di-submit
 * via server action (FormData). Memakai explicit render agar bisa reset ulang
 * setelah submit gagal.
 *
 * Deteksi kesiapan script TIDAK mengandalkan next/script onLoad: saat user
 * berpindah halaman via client-side navigation (misal /login → /register),
 * script yang sudah termuat tidak dieksekusi ulang dan onLoad tidak pernah
 * terpanggil — widget tidak pernah muncul sampai user refresh manual.
 * Sebagai gantinya kita poll window.turnstile (cepat jika sudah termuat,
 * tetap jalan saat script sedang loading), dengan timeout → pesan error +
 * tombol coba lagi.
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
  const [ready, setReady] = useState(false);
  const [errored, setErrored] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Simpan onVerified terbaru di ref supaya callback Turnstile stabil dan
  // effect render tidak bongkar-pasang widget setiap parent re-render.
  const onVerifiedRef = useRef(onVerified);
  useEffect(() => {
    onVerifiedRef.current = onVerified;
  });

  // Deteksi kesiapan window.turnstile (polling), bukan onLoad next/script.
  useEffect(() => {
    if (!siteKey) return;
    setErrored(false);

    if (window.turnstile) {
      setReady(true);
      return;
    }

    const poll = setInterval(() => {
      if (window.turnstile) {
        clearInterval(poll);
        clearTimeout(timeout);
        setReady(true);
      }
    }, POLL_INTERVAL_MS);

    const timeout = setTimeout(() => {
      clearInterval(poll);
      if (!window.turnstile) setErrored(true);
    }, LOAD_TIMEOUT_MS);

    return () => {
      clearInterval(poll);
      clearTimeout(timeout);
    };
  }, [siteKey, attempt]);

  // Render widget begitu script siap.
  useEffect(() => {
    if (!siteKey || !ready || !containerRef.current) return;
    if (widgetIdRef.current) return;
    if (!window.turnstile) return;

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      appearance: "always",
      callback: (token: string) => {
        setErrored(false);
        onVerifiedRef.current?.(token);
      },
      "error-callback": () => {
        setErrored(true);
        onVerifiedRef.current?.("");
      },
      "expired-callback": () => {
        onVerifiedRef.current?.("");
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
  }, [siteKey, ready]);

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

  const retry = useCallback(() => {
    // Coba lagi deteksi + render tanpa reload halaman.
    setReady(false);
    setErrored(false);
    setAttempt((a) => a + 1);
  }, []);

  if (!siteKey) return null;

  return (
    <div className={className}>
      <Script
        src={SCRIPT_SRC}
        strategy="afterInteractive"
        onLoad={() => setReady(true)}
        onError={() => setErrored(true)}
      />
      <div ref={containerRef} className="min-h-[65px]" />
      {errored && (
        <div className="mt-1 text-center">
          <p className="text-xs text-red-400">
            Verifikasi keamanan gagal dimuat.
          </p>
          <button
            type="button"
            onClick={retry}
            className="mt-1.5 text-xs font-medium text-foreground underline underline-offset-2 hover:text-[#b8ff45] transition"
          >
            Coba muat ulang widget
          </button>
        </div>
      )}
    </div>
  );
}
