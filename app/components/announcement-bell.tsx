"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";

export const ANNOUNCEMENTS_SEEN_KEY = "announcements:lastSeenAt";
export const ANNOUNCEMENTS_SEEN_EVENT = "announcements:seen";

/**
 * Jumlah pengumuman yang lebih baru dari yang terakhir dilihat user
 * (disimpan per-browser di localStorage). `times` = createdAt ISO, terbaru dulu.
 */
export function useUnreadAnnouncements(times: string[]): number {
  const [unread, setUnread] = useState(0);
  const key = times.join("|");

  useEffect(() => {
    // Turunkan dari `key` (string stabil) agar array baru tiap render tidak memicu ulang efek.
    const list = key ? key.split("|") : [];
    function check() {
      let seen: string | null = null;
      try {
        seen = localStorage.getItem(ANNOUNCEMENTS_SEEN_KEY);
      } catch {
        // ignore
      }
      setUnread(seen ? list.filter((t) => t > seen).length : list.length);
    }
    check();
    window.addEventListener(ANNOUNCEMENTS_SEEN_EVENT, check);
    window.addEventListener("storage", check);
    return () => {
      window.removeEventListener(ANNOUNCEMENTS_SEEN_EVENT, check);
      window.removeEventListener("storage", check);
    };
  }, [key]);

  return unread;
}

/** Badge merah berisi jumlah belum dibaca, dengan denyut agar mudah terlihat. */
export function UnreadBadge({ count, className = "" }: { count: number; className?: string }) {
  if (count <= 0) return null;
  const text = count > 9 ? "9+" : String(count);
  return (
    <span className={`relative inline-flex ${className}`}>
      <span className="absolute inset-0 animate-ping rounded-full bg-red-500 opacity-60" />
      <span className="relative inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow-[0_0_10px_rgba(239,68,68,0.6)] ring-2 ring-background">
        {text}
      </span>
    </span>
  );
}

/**
 * Ikon lonceng di topbar dashboard. Menuju halaman Pengumuman; jika ada
 * pengumuman belum dibaca, lonceng bergoyang dan muncul badge jumlahnya.
 */
export function AnnouncementBell({
  unread,
  label,
  unreadLabel,
}: {
  unread: number;
  label: string;
  unreadLabel: string;
}) {
  const hasUnread = unread > 0;
  const title = hasUnread ? unreadLabel : label;
  return (
    <Link
      href="/dashboard/pengumuman"
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-lg border transition focus-ring ${
        hasUnread
          ? "border-red-500/40 bg-red-500/10 text-red-300 hover:text-red-200"
          : "border-white/10 text-muted-foreground hover:text-foreground"
      }`}
      aria-label={title}
      title={title}
    >
      <svg viewBox="0 0 24 24" fill="none" className={`h-[18px] w-[18px] ${hasUnread ? "animate-bell-ring" : ""}`}>
        <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {/* Bungkus terpisah: UnreadBadge sendiri `relative`, jadi posisi absolut harus di luar. */}
      {hasUnread && (
        <span className="pointer-events-none absolute -right-2 -top-2 flex">
          <UnreadBadge count={unread} />
        </span>
      )}
    </Link>
  );
}
