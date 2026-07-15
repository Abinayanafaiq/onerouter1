"use client";

import { useState, useRef } from "react";

export function QrisUploader({ currentImage }: { currentImage: string | null }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentImage);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMsg(null);
    try {
      const formData = new FormData();
      formData.append("qris", file);
      const res = await fetch("/api/admin/settings/qris", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) {
        const reader = new FileReader();
        reader.onload = () => setPreview(reader.result as string);
        reader.readAsDataURL(file);
        setMsg("QRIS berhasil diupload");
      } else {
        setMsg(data.error || "Gagal upload");
      }
    } catch {
      setMsg("Koneksi gagal");
    }
    setUploading(false);
    setTimeout(() => setMsg(null), 3000);
  }

  async function handleDelete() {
    if (!confirm("Hapus gambar QRIS?")) return;
    setUploading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/settings/qris", { method: "DELETE" });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) {
        setPreview(null);
        setMsg("QRIS dihapus");
      } else {
        setMsg(data.error || "Gagal hapus");
      }
    } catch {
      setMsg("Koneksi gagal");
    }
    setUploading(false);
    setTimeout(() => setMsg(null), 3000);
  }

  return (
    <div className="border border-neutral-800 rounded-lg p-4 bg-neutral-900 space-y-4">
      <h2 className="text-sm font-medium text-neutral-300">Gambar QRIS</h2>
      <p className="text-xs text-neutral-500">
        Gambar ini akan tampil di halaman checkout saat user memilih bayar via QRIS/Transfer.
      </p>

      {preview ? (
        <div className="space-y-3">
          <img
            src={preview}
            alt="QRIS Preview"
            className="max-w-[200px] w-full rounded-lg border border-neutral-700"
          />
          <div className="flex gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="bg-neutral-100 text-neutral-900 px-3 py-1.5 rounded-md text-xs font-medium hover:bg-neutral-300 disabled:opacity-50 transition"
            >
              {uploading ? "..." : "Ganti"}
            </button>
            <button
              onClick={handleDelete}
              disabled={uploading}
              className="border border-red-800 text-red-400 px-3 py-1.5 rounded-md text-xs font-medium hover:bg-red-950/50 disabled:opacity-50 transition"
            >
              Hapus
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full border border-dashed border-neutral-700 rounded-lg py-8 text-center text-sm text-neutral-500 hover:border-neutral-600 hover:text-neutral-400 transition disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "+ Upload Gambar QRIS"}
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />

      {msg && <p className="text-xs text-neutral-500">{msg}</p>}
    </div>
  );
}
