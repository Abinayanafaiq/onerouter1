"use client";

import { useState } from "react";

export function EmailBlacklistForm({ initial }: { initial: { domains: string[] } }) {
  const [domains, setDomains] = useState<string[]>(initial.domains);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function flash() {
    setTimeout(() => {
      setMsg(null);
      setError(null);
    }, 3500);
  }

  async function callApi(action: "add" | "remove", domain: string): Promise<boolean> {
    setSaving(true);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings/email-blacklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, domain }),
      });
      const data = (await res.json()) as {
        success: boolean;
        error?: string;
        domains?: string[];
        alreadyExists?: boolean;
      };
      if (data.success && data.domains) {
        setDomains(data.domains);
        return true;
      }
      setError(data.error || "Gagal menyimpan");
      return false;
    } catch {
      setError("Koneksi gagal");
      return false;
    } finally {
      setSaving(false);
      flash();
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const domain = input.trim().toLowerCase().replace(/^@+/, "");
    if (!domain) return;
    const ok = await callApi("add", domain);
    if (ok) {
      setInput("");
      setMsg(`Domain ${domain} diblacklist`);
    }
  }

  async function handleRemove(domain: string) {
    if (!confirm(`Hapus ${domain} dari blacklist? Domain ini akan bisa dipakai mendaftar lagi.`)) return;
    const ok = await callApi("remove", domain);
    if (ok) setMsg(`${domain} dihapus dari blacklist`);
  }

  const inputCls =
    "w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-md text-sm text-neutral-200 font-mono";

  return (
    <div className="border border-neutral-800 rounded-lg p-4 bg-neutral-900 space-y-4">
      <div>
        <h2 className="text-sm font-medium text-neutral-300">Blacklist Domain Email</h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          Domain di daftar ini tidak bisa dipakai mendaftar akun baru. Subdomain ikut terblokir
          (mis. <code className="font-mono">evil.com</code> juga menolak{" "}
          <code className="font-mono">mail.evil.com</code>). Akun yang sudah terdaftar tidak
          terpengaruh.
        </p>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="contoh: spammer.com"
          className={`flex-1 ${inputCls}`}
        />
        <button
          type="submit"
          disabled={saving || !input.trim()}
          className="bg-neutral-100 text-neutral-900 px-4 py-2 rounded-md text-xs font-medium hover:bg-neutral-300 disabled:opacity-50 transition shrink-0"
        >
          {saving ? "Menyimpan..." : "Blacklist"}
        </button>
      </form>

      {domains.length === 0 ? (
        <p className="text-xs text-neutral-600 border border-dashed border-neutral-800 rounded-md px-3 py-4 text-center">
          Belum ada domain yang diblacklist.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-800 border border-neutral-800 rounded-md overflow-hidden">
          {domains.map((d) => (
            <li key={d} className="flex items-center justify-between gap-3 px-3 py-2 bg-neutral-950">
              <code className="text-xs font-mono text-neutral-300 break-all">{d}</code>
              <button
                type="button"
                onClick={() => handleRemove(d)}
                disabled={saving}
                className="border border-red-800 text-red-400 px-3 py-1 rounded-md text-xs font-medium hover:bg-red-950/50 disabled:opacity-50 transition shrink-0"
              >
                Hapus
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-3">
        {msg && <span className="text-xs text-green-400">{msg}</span>}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </div>
  );
}
