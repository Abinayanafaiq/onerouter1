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
 * Waktu pengumuman terbaru yang dipublikasikan — dipakai layout dashboard
 * untuk titik "belum dibaca" di ikon lonceng. Satu query ringan; gagal
 * dianggap tidak ada pengumuman agar dashboard tetap jalan.
 */
export async function getLatestAnnouncementAt(): Promise<string | null> {
  try {
    const row = await prisma.announcement.findFirst({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    return row ? row.createdAt.toISOString() : null;
  } catch (e) {
    console.error("[announcements] latest lookup failed:", e);
    return null;
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
