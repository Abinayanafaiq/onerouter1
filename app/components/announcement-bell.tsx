"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";

export const ANNOUNCEMENTS_SEEN_KEY = "announcements:lastSeenAt";
export const ANNOUNCEMENTS_SEEN_EVENT = "announcements:seen";

/**
 * Ikon lonceng di topbar dashboard. Menuju halaman Pengumuman dan menampilkan
 * titik jika ada pengumuman yang lebih baru dari yang terakhir dilihat user
 * (disimpan per-browser di localStorage).
 */
export function AnnouncementBell({
  latestAt,
  label,
}: {
  latestAt: string | null;
  label: string;
}) {
  const [unread, setUnread] = useState(false);

  useEffect(() => {
    function check() {
      if (!latestAt) {
        setUnread(false);
        return;
      }
      let seen: string | null = null;
      try {
        seen = localStorage.getItem(ANNOUNCEMENTS_SEEN_KEY);
      } catch {
        // ignore
      }
      setUnread(!seen || seen < latestAt);
    }
    check();
    window.addEventListener(ANNOUNCEMENTS_SEEN_EVENT, check);
    return () => window.removeEventListener(ANNOUNCEMENTS_SEEN_EVENT, check);
  }, [latestAt]);

  return (
    <Link
      href="/dashboard/pengumuman"
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-muted-foreground transition hover:text-foreground focus-ring"
      aria-label={label}
      title={label}
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]">
        <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {unread && (
        <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--accent-glow)]" />
      )}
    </Link>
  );
}
