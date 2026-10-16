"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { ANNOUNCEMENTS_SEEN_EVENT, ANNOUNCEMENTS_SEEN_KEY } from "@/app/components/announcement-bell";

/**
 * Waktu terakhir user melihat pengumuman SEBELUM halaman ini dibuka.
 * `undefined` = belum dibaca dari storage, `null` = belum pernah melihat.
 */
const PreviousSeenContext = createContext<string | null | undefined>(undefined);

/**
 * Catat waktu "terakhir dilihat" yang lama (untuk label "Baru"), lalu simpan
 * waktu pengumuman terbaru agar badge di lonceng & sidebar hilang.
 */
export function AnnouncementsSeenProvider({
  latest,
  children,
}: {
  latest: string | null;
  children: React.ReactNode;
}) {
  const [previousSeen, setPreviousSeen] = useState<string | null | undefined>(undefined);
  // Ambil nilai lama sekali per kunjungan — efek bisa jalan ulang (StrictMode /
  // refresh) setelah storage sudah ditimpa, dan itu akan menghapus label "Baru".
  const captured = useRef(false);

  useEffect(() => {
    if (!captured.current) {
      captured.current = true;
      let prev: string | null = null;
      try {
        prev = localStorage.getItem(ANNOUNCEMENTS_SEEN_KEY);
      } catch {
        // storage diblokir — anggap belum pernah melihat
      }
      setPreviousSeen(prev);
    }
    if (!latest) return;
    try {
      localStorage.setItem(ANNOUNCEMENTS_SEEN_KEY, latest);
    } catch {
      // storage diblokir — badge tetap tampil, tidak masalah
    }
    window.dispatchEvent(new Event(ANNOUNCEMENTS_SEEN_EVENT));
  }, [latest]);

  return <PreviousSeenContext.Provider value={previousSeen}>{children}</PreviousSeenContext.Provider>;
}

/** Label "Baru" untuk pengumuman yang terbit setelah kunjungan terakhir user. */
export function NewAnnouncementBadge({ createdAt, label }: { createdAt: string; label: string }) {
  const previousSeen = useContext(PreviousSeenContext);
  if (previousSeen === undefined) return null;
  if (previousSeen !== null && createdAt <= previousSeen) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-300 animate-fade-up">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-400" />
      </span>
      {label}
    </span>
  );
}
