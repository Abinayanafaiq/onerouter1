"use client";

import { useRef, useState } from "react";

export function FaviconUploader({ currentImage }: { currentImage: string | null }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentImage);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("favicon", file);
      const response = await fetch("/api/admin/settings/favicon", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as {
        success: boolean;
        error?: string;
        value?: string;
      };

      if (data.success && data.value) {
        setPreview(data.value);
        setMessage("Favicon berhasil diperbarui");
      } else {
        setMessage(data.error || "Gagal mengunggah favicon");
      }
    } catch {
      setMessage("Koneksi gagal");
    } finally {
      setUploading(false);
      event.target.value = "";
      setTimeout(() => setMessage(null), 3000);
    }
  }

  async function handleDelete() {
    if (!confirm("Kembalikan favicon ke ikon bawaan?")) return;

    setUploading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/settings/favicon", {
        method: "DELETE",
      });
      const data = (await response.json()) as { success: boolean; error?: string };

      if (data.success) {
        setPreview(null);
        setMessage("Favicon dikembalikan ke ikon bawaan");
      } else {
        setMessage(data.error || "Gagal menghapus favicon");
      }
    } catch {
      setMessage("Koneksi gagal");
    } finally {
      setUploading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <div>
        <h2 className="text-sm font-medium text-neutral-300">Favicon Situs</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Ikon yang tampil pada tab browser. Gunakan gambar persegi PNG, JPEG, atau WebP maksimal 5 MB.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex size-16 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-950">
          <img
            src={preview || "/icon"}
            alt="Pratinjau favicon"
            className="size-10 object-contain"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="rounded-md bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-900 transition hover:bg-neutral-300 disabled:opacity-50"
          >
            {uploading ? "Memproses..." : preview ? "Ganti" : "Unggah"}
          </button>
          {preview && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={uploading}
              className="rounded-md border border-red-800 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-950/50 disabled:opacity-50"
            >
              Hapus
            </button>
          )}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleUpload}
        className="hidden"
      />
      {message && <p className="text-xs text-neutral-500">{message}</p>}
    </div>
  );
}
