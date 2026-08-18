"use client";

import { useState } from "react";

export function UpgradeButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upgrade() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mercadopago/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo iniciar el pago");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("No se pudo iniciar el pago");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={upgrade}
        disabled={loading}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-40"
      >
        {loading ? "Redirigiendo..." : "Mejorar plan"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}