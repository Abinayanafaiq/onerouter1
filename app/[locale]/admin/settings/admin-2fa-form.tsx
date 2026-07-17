"use client";

import { useState } from "react";

type InitialData = {
  enabled: boolean;
  question: string;
  answerSet: boolean;
};

export function Admin2FAForm({ initial }: { initial: InitialData }) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [question, setQuestion] = useState(initial.question);
  const [answer, setAnswer] = useState("");
  const [confirmAnswer, setConfirmAnswer] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function resetTransient() {
    setTimeout(() => {
      setMsg(null);
      setError(null);
    }, 4000);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setError(null);

    const q = question.trim();
    const a = answer.trim();
    const ca = confirmAnswer.trim();

    if (!q) {
      setError("Pertanyaan wajib diisi");
      setSaving(false);
      return;
    }
    if (q.length > 200) {
      setError("Pertanyaan terlalu panjang (maks 200 karakter)");
      setSaving(false);
      return;
    }
    if (a.length < 2) {
      setError("Jawaban minimal 2 karakter");
      setSaving(false);
      return;
    }
    if (a.length > 200) {
      setError("Jawaban terlalu panjang (maks 200 karakter)");
      setSaving(false);
      return;
    }
    if (a !== ca) {
      setError("Konfirmasi jawaban tidak cocok");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, answer: a }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) {
        setEnabled(true);
        setAnswer("");
        setConfirmAnswer("");
        setMsg("Pertanyaan keamanan disimpan. Login admin berikutnya akan memverifikasi jawaban ini.");
      } else {
        setError(data.error || "Gagal menyimpan");
      }
    } catch {
      setError("Koneksi gagal");
    }
    setSaving(false);
    resetTransient();
  }

  async function handleDisable() {
    if (!confirm("Nonaktifkan pertanyaan keamanan? Login admin berikutnya tidak akan memerlukan jawaban pertanyaan.")) {
      return;
    }
    setSaving(true);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/2fa", { method: "DELETE" });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) {
        setEnabled(false);
        setQuestion("");
        setAnswer("");
        setConfirmAnswer("");
        setMsg("Pertanyaan keamanan dinonaktifkan");
      } else {
        setError(data.error || "Gagal menonaktifkan");
      }
    } catch {
      setError("Koneksi gagal");
    }
    setSaving(false);
    resetTransient();
  }

  return (
    <form
      onSubmit={handleSave}
      className="border border-neutral-800 rounded-lg p-4 bg-neutral-900 space-y-4"
    >
      <div>
        <h2 className="text-sm font-medium text-neutral-300">Pertanyaan Keamanan Admin (2FA)</h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          Lapisan kedua saat login admin. Setelah di-set, login admin akan memverifikasi jawaban pertanyaan ini selain password.
        </p>
      </div>

      {enabled && (
        <div className="rounded-md border border-green-700/40 bg-green-900/10 p-2.5">
          <p className="text-xs text-green-400 font-medium">
            2FA aktif. Login admin akan menanyakan pertanyaan keamanan.
          </p>
        </div>
      )}

      <div>
        <label className="text-xs font-medium text-neutral-400 block mb-1">Pertanyaan</label>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Contoh: Apa nama ibu kandung Anda?"
          maxLength={200}
          className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-md text-sm text-neutral-200"
        />
        <p className="text-[10px] text-neutral-600 mt-1">
          Pilih pertanyaan yang jawabannya hanya Anda yang tahu. Hindari pertanyaan yang jawabannya mudah dicari di media sosial.
        </p>
      </div>

      <div>
        <label className="text-xs font-medium text-neutral-400 block mb-1">Jawaban</label>
        <input
          type="password"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={initial.answerSet ? "Isi untuk mengganti jawaban lama" : "Masukkan jawaban"}
          maxLength={200}
          className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-md text-sm text-neutral-200 font-mono"
        />
        <p className="text-[10px] text-neutral-600 mt-1">
          Disimpan sebagai hash SHA-256 (tidak bisa dilihat kembali). Normalisasi: huruf kecil + trim spasi ganda.
        </p>
      </div>

      <div>
        <label className="text-xs font-medium text-neutral-400 block mb-1">Konfirmasi Jawaban</label>
        <input
          type="password"
          value={confirmAnswer}
          onChange={(e) => setConfirmAnswer(e.target.value)}
          placeholder="Ulangi jawaban"
          maxLength={200}
          className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-md text-sm text-neutral-200 font-mono"
        />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="bg-neutral-100 text-neutral-900 px-4 py-2 rounded-md text-xs font-medium hover:bg-neutral-300 disabled:opacity-50 transition"
        >
          {saving ? "Menyimpan..." : enabled ? "Perbarui" : "Aktifkan 2FA"}
        </button>
        {enabled && (
          <button
            type="button"
            onClick={handleDisable}
            disabled={saving}
            className="border border-red-800 text-red-400 px-3 py-1.5 rounded-md text-xs font-medium hover:bg-red-950/50 disabled:opacity-50 transition"
          >
            Nonaktifkan
          </button>
        )}
        {msg && <span className="text-xs text-green-400">{msg}</span>}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </form>
  );
}
