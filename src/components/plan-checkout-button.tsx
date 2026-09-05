"use client";

import { useState } from "react";

export function PlanCheckoutButton({
  planId,
  label = "Elegir este plan",
}: {
  planId: string;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mercadopago/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo iniciar el pago");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("No se obtuvo un link de pago");
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
        onClick={checkout}
        disabled={loading}
        className="w-full rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-sky-500 disabled:opacity-40"
      >
        {loading ? "Redirigiendo a Mercado Pago..." : label}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}