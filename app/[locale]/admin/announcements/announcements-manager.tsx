"use client";

import { useState } from "react";
import type { AnnouncementLevel, AnnouncementView } from "@/app/lib/announcements";

const LEVEL_OPTIONS: { value: AnnouncementLevel; label: string; cls: string }[] = [
  { value: "info", label: "Info", cls: "text-sky-400 border-sky-500/30 bg-sky-500/10" },
  { value: "success", label: "Kabar baik", cls: "text-green-400 border-green-500/30 bg-green-500/10" },
  { value: "warning", label: "Peringatan", cls: "text-amber-400 border-amber-500/30 bg-amber-500/10" },
  { value: "critical", label: "Penting", cls: "text-red-400 border-red-500/30 bg-red-500/10" },
];

function levelMeta(level: AnnouncementLevel) {
  return LEVEL_OPTIONS.find((l) => l.value === level) ?? LEVEL_OPTIONS[0];
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

type Draft = {
  title: string;
  body: string;
  level: AnnouncementLevel;
  pinned: boolean;
  published: boolean;
};

const EMPTY_DRAFT: Draft = { title: "", body: "", level: "info", pinned: false, published: true };

export function AnnouncementsManager({
  initialAnnouncements,
}: {
  initialAnnouncements: AnnouncementView[];
}) {
  const [items, setItems] = useState<AnnouncementView[]>(initialAnnouncements);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function flash(m: string | null, e: string | null) {
    setMsg(m);
    setError(e);
    setTimeout(() => {
      setMsg(null);
      setError(null);
    }, 3500);
  }

  async function refresh() {
    try {
      const res = await fetch("/api/admin/announcements");
      const data = (await res.json()) as { success: boolean; announcements?: AnnouncementView[] };
      if (data.success && data.announcements) setItems(data.announcements);
    } catch {
      // ignore
    }
  }

  function startEdit(a: AnnouncementView) {
    setEditingId(a.id);
    setDraft({ title: a.title, body: a.body, level: a.level, pinned: a.pinned, published: a.published });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.title.trim() || !draft.body.trim()) {
      flash(null, "Judul dan isi wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        editingId ? `/api/admin/announcements/${editingId}` : "/api/admin/announcements",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        },
      );
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) {
        flash(editingId ? "Pengumuman diperbarui" : draft.published ? "Pengumuman terkirim" : "Draf disimpan", null);
        cancelEdit();
        await refresh();
      } else {
        flash(null, data.error || "Gagal menyimpan");
      }
    } catch {
      flash(null, "Koneksi gagal");
    }
    setSaving(false);
  }

  async function patch(id: string, body: Partial<Draft>) {
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) await refresh();
      else flash(null, data.error || "Gagal");
    } catch {
      flash(null, "Koneksi gagal");
    }
  }

  async function handleDelete(a: AnnouncementView) {
    if (!confirm(`Hapus pengumuman "${a.title}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    try {
      const res = await fetch(`/api/admin/announcements/${a.id}`, { method: "DELETE" });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) {
        if (editingId === a.id) cancelEdit();
        await refresh();
      } else {
        flash(null, data.error || "Gagal menghapus");
      }
    } catch {
      flash(null, "Koneksi gagal");
    }
  }

  return (
    <div className="space-y-4">
      {msg && <div className="text-xs text-green-400">{msg}</div>}
      {error && <div className="text-xs text-red-400">{error}</div>}

      {/* Compose */}
      <form
        onSubmit={handleSubmit}
        className="border border-neutral-800 rounded-lg bg-neutral-900 p-4 space-y-3"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-neutral-300">
            {editingId ? "Edit Pengumuman" : "Buat Pengumuman Baru"}
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="text-xs text-neutral-500 hover:text-neutral-300"
            >
              Batal edit
            </button>
          )}
        </div>
        <div>
          <label className="text-xs text-neutral-500 block mb-1">Judul</label>
          <input
            type="text"
            value={draft.title}
            maxLength={200}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="contoh: Pemeliharaan server 20 Oktober"
            className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-md text-sm text-neutral-200"
          />
        </div>
        <div>
          <label className="text-xs text-neutral-500 block mb-1">Isi</label>
          <textarea
            value={draft.body}
            maxLength={10000}
            rows={6}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            placeholder="Tulis isi pengumuman. Baris baru dan link (https://...) akan ditampilkan apa adanya."
            className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-md text-sm text-neutral-200 leading-relaxed"
          />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="text-xs text-neutral-500 block mb-1">Jenis</label>
            <select
              value={draft.level}
              onChange={(e) => setDraft({ ...draft, level: e.target.value as AnnouncementLevel })}
              className="px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-md text-sm text-neutral-200"
            >
              {LEVEL_OPTIONS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs text-neutral-400 mt-5">
            <input
              type="checkbox"
              checked={draft.pinned}
              onChange={(e) => setDraft({ ...draft, pinned: e.target.checked })}
            />
            Sematkan di atas
          </label>
          <label className="flex items-center gap-2 text-xs text-neutral-400 mt-5">
            <input
              type="checkbox"
              checked={draft.published}
              onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
            />
            Publikasikan sekarang
          </label>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="bg-neutral-100 text-neutral-900 px-4 py-2 rounded-md text-xs font-medium hover:bg-neutral-300 disabled:opacity-50 transition"
        >
          {saving
            ? "Menyimpan..."
            : editingId
              ? "Simpan Perubahan"
              : draft.published
                ? "Kirim Pengumuman"
                : "Simpan Draf"}
        </button>
      </form>

      {/* List */}
      <div className="border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900">
        <div className="p-3 border-b border-neutral-800">
          <h2 className="text-sm font-medium text-neutral-300">Semua Pengumuman ({items.length})</h2>
        </div>
        {items.length === 0 ? (
          <div className="p-6 text-center text-neutral-500 text-sm">Belum ada pengumuman.</div>
        ) : (
          <div className="divide-y divide-neutral-800">
            {items.map((a) => {
              const lvl = levelMeta(a.level);
              return (
                <div key={a.id} className="p-3 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${lvl.cls}`}>
                      {lvl.label}
                    </span>
                    {a.pinned && (
                      <span className="inline-block rounded-full border border-neutral-700 px-2 py-0.5 text-[10px] text-neutral-300">
                        Disematkan
                      </span>
                    )}
                    {!a.published && (
                      <span className="inline-block rounded-full border border-neutral-700 bg-neutral-800/50 px-2 py-0.5 text-[10px] text-neutral-500">
                        Draf
                      </span>
                    )}
                    <span className="text-[10px] text-neutral-600 ml-auto">{fmtDate(a.createdAt)}</span>
                  </div>
                  <div className="text-sm font-medium text-neutral-100">{a.title}</div>
                  <p className="text-xs text-neutral-400 whitespace-pre-wrap line-clamp-3">{a.body}</p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      onClick={() => startEdit(a)}
                      className="text-xs px-2 py-1 rounded border border-neutral-700 text-neutral-300 hover:bg-neutral-800 transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => patch(a.id, { published: !a.published })}
                      className={`text-xs px-2 py-1 rounded transition ${
                        a.published
                          ? "border border-neutral-700 text-neutral-400 hover:bg-neutral-800"
                          : "border border-green-700 text-green-400 hover:bg-green-950/50"
                      }`}
                    >
                      {a.published ? "Sembunyikan" : "Publikasikan"}
                    </button>
                    <button
                      onClick={() => patch(a.id, { pinned: !a.pinned })}
                      className="text-xs px-2 py-1 rounded border border-neutral-700 text-neutral-400 hover:bg-neutral-800 transition"
                    >
                      {a.pinned ? "Lepas sematan" : "Sematkan"}
                    </button>
                    <button
                      onClick={() => handleDelete(a)}
                      className="text-xs px-2 py-1 rounded border border-red-800 text-red-400 hover:bg-red-950/50 transition"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
