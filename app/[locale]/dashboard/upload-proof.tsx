"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function UploadProof({ orderId }: { orderId: string }) {
  const t = useTranslations("Overview");
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("orderId", orderId);
    fd.append("proof", file);
    try {
      const res = await fetch("/api/orders/manual/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) {
        setDone(true);
        router.refresh();
      } else {
        alert(data.error || t("uploadFailed"));
      }
    } catch {
      alert(t("connectionFailed"));
    }
    setUploading(false);
  }

  if (done) {
    return (
      <span className="text-xs text-green-700 font-medium">{t("proofSent")}</span>
    );
  }

  return (
    <button
      type="button"
      disabled={uploading}
      onClick={() => inputRef.current?.click()}
      className="border px-3 py-1 rounded-md text-xs hover:bg-muted disabled:opacity-50"
    >
      {uploading ? t("uploading") : t("uploadProof")}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />
    </button>
  );
}