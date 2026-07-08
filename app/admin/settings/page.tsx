import { prisma } from "@/app/lib/prisma";
import { QrisUploader } from "./qris-uploader";

export default async function AdminSettingsPage() {
  const setting = await prisma.setting.findUnique({
    where: { key: "qris_image" },
  });

  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <h1 className="text-xl font-bold text-neutral-100">Pengaturan</h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Kelola QRIS & pengaturan lainnya
        </p>
      </div>
      <QrisUploader currentImage={setting?.value ?? null} />
    </div>
  );
}
