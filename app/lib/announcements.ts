import { prisma } from "./prisma";

export const ANNOUNCEMENT_LEVELS = ["info", "success", "warning", "critical"] as const;
export type AnnouncementLevel = (typeof ANNOUNCEMENT_LEVELS)[number];

export type AnnouncementView = {
  id: string;
  title: string;
  body: string;
  level: AnnouncementLevel;
  pinned: boolean;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export function normalizeLevel(v: unknown): AnnouncementLevel {
  return ANNOUNCEMENT_LEVELS.includes(v as AnnouncementLevel)
    ? (v as AnnouncementLevel)
    : "info";
}

function toView(row: {
  id: string;
  title: string;
  body: string;
  level: string;
  pinned: boolean;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}): AnnouncementView {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    level: normalizeLevel(row.level),
    pinned: row.pinned,
    published: row.published,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Pengumuman yang terlihat oleh user: hanya yang dipublikasikan, disematkan dulu. */
export async function listPublishedAnnouncements(take = 50): Promise<AnnouncementView[]> {
  const rows = await prisma.announcement.findMany({
    where: { published: true },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take,
  });
  return rows.map(toView);
}

/** Semua pengumuman (termasuk draf) untuk halaman admin. */
export async function listAllAnnouncements(take = 200): Promise<AnnouncementView[]> {
  const rows = await prisma.announcement.findMany({
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take,
  });
  return rows.map(toView);
}

/**
 * Waktu terbit pengumuman terbaru (terbaru dulu) — dipakai layout dashboard
 * untuk badge jumlah "belum dibaca" di lonceng & sidebar. Satu query ringan
 * yang hanya mengambil createdAt; gagal dianggap tidak ada pengumuman agar
 * dashboard tetap jalan.
 */
export async function getRecentAnnouncementTimes(take = 10): Promise<string[]> {
  try {
    const rows = await prisma.announcement.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
      take,
    });
    return rows.map((r) => r.createdAt.toISOString());
  } catch (e) {
    console.error("[announcements] recent lookup failed:", e);
    return [];
  }
}

export async function createAnnouncement(input: {
  title: string;
  body: string;
  level: AnnouncementLevel;
  pinned: boolean;
  published: boolean;
  createdById: string | null;
}): Promise<AnnouncementView> {
  const row = await prisma.announcement.create({ data: input });
  return toView(row);
}

export async function updateAnnouncement(
  id: string,
  patch: Partial<{
    title: string;
    body: string;
    level: AnnouncementLevel;
    pinned: boolean;
    published: boolean;
  }>,
): Promise<AnnouncementView | null> {
  const existing = await prisma.announcement.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;
  const row = await prisma.announcement.update({ where: { id }, data: patch });
  return toView(row);
}

export async function deleteAnnouncement(id: string): Promise<boolean> {
  const res = await prisma.announcement.deleteMany({ where: { id } });
  return res.count > 0;
}
