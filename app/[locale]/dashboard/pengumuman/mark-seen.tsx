"use client";

import { useEffect } from "react";
import { ANNOUNCEMENTS_SEEN_EVENT, ANNOUNCEMENTS_SEEN_KEY } from "@/app/components/announcement-bell";

/** Simpan waktu pengumuman terbaru yang sudah dilihat agar titik di lonceng hilang. */
export function MarkAnnouncementsSeen({ latest }: { latest: string | null }) {
  useEffect(() => {
    if (!latest) return;
    try {
      localStorage.setItem(ANNOUNCEMENTS_SEEN_KEY, latest);
    } catch {
      // storage diblokir — titik tetap tampil, tidak masalah
    }
    window.dispatchEvent(new Event(ANNOUNCEMENTS_SEEN_EVENT));
  }, [latest]);
  return null;
}
