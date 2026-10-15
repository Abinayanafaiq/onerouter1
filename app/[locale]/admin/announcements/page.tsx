import { listAllAnnouncements } from "@/app/lib/announcements";
import { requireAdmin } from "@/app/lib/admin-guard";
import { AnnouncementsManager } from "./announcements-manager";

export const dynamic = "force-dynamic";

export default async function AdminAnnouncementsPage() {
  await requireAdmin();
  const announcements = await listAllAnnouncements();

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-neutral-100">Pengumuman</h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Kirim pengumuman ke semua user. Pengumuman yang dipublikasikan tampil di halaman
          Pengumuman pada dashboard user.
        </p>
      </div>
      <AnnouncementsManager initialAnnouncements={announcements} />
    </div>
  );
}
