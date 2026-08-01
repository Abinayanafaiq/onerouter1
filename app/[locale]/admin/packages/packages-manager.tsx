"use client";

import { useState } from "react";
import { PackageEditor, type PackageData } from "./package-editor";

export function PackagesManager({
  packages,
  availableModels = [],
}: {
  packages: PackageData[];
  availableModels?: string[];
}) {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-neutral-500">Stok 0 = tidak bisa dibeli</p>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="bg-neutral-100 text-neutral-900 px-3 py-1 rounded-md text-xs font-medium hover:bg-neutral-300 transition"
        >
          {showAdd ? "Batal" : "+ Tambah Paket"}
        </button>
      </div>

      {showAdd && (
        <PackageEditor pkg={null} onClose={() => setShowAdd(false)} availableModels={availableModels} />
      )}

      <div className="space-y-2">
        {packages.length === 0 && !showAdd ? (
          <div className="border border-neutral-800 rounded-lg p-6 text-center text-neutral-500 text-sm bg-neutral-900">
            Belum ada paket. Klik &quot;+ Tambah Paket&quot; untuk membuat.
          </div>
        ) : (
          packages.map((p) => <PackageEditor key={p.id} pkg={p} availableModels={availableModels} />)
        )}
      </div>
    </div>
  );
}
