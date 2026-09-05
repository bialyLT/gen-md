"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

const MAX_ATTEMPTS = 4;
const RETRY_DELAY_MS = 8000;

const FAILED_STATUSES = new Set([
  "rejected",
  "cancelled",
  "refunded",
  "charged_back",
]);

function ActivatorInner() {
  const router = useRouter();
  const params = useSearchParams();
  const ran = useRef(false);
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">(
    "idle"
  );
  const [showOverlay, setShowOverlay] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const preapprovalId = params.get("preapproval_id");
    if (ran.current || !preapprovalId) return;
    ran.current = true;
    const id: string = preapprovalId;

    async function run() {
      // Mercado Pago redirige de vuelta con ?preapproval_id=... (no manda
      // checkout=success). Si volvimos con preapproval_id venimos del
      // checkout de suscripción: mostramos el loading.
      setShowOverlay(true);

      const status = params.get("collection_status") ?? params.get("status");
      if (status && FAILED_STATUSES.has(status)) {
        setError("El pago no se pudo completar. Intentalo de nuevo.");
        setState("error");
        return;
      }

      setState("loading");

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        }

        let res: Response;
        try {
          res = await fetch(
            `/api/mercadopago/activate?preapproval_id=${encodeURIComponent(id)}`
          );
        } catch {
          // Error de red transitorio: reintentamos.
          continue;
        }

        if (res.ok) {
          setState("ok");
          router.refresh();
          return;
        }

        const data = await res.json().catch(() => null);
        // Errores definitivos: no tiene sentido reintentar.
        if (res.status === 401 || res.status === 403 || res.status === 503) {
          setError(
            data?.error ??
              "No pudimos activar tu suscripción. Si el pago se acreditó, escribinos y lo activamos."
          );
          setState("error");
          return;
        }
      }

      // Se agotaron los reintentos: el pago se confirma en unos minutos
      // por webhook y la activación es automática.
      setError(
        "El pago todavía no se confirma. Si ya pagaste, tu plan se activa automáticamente en unos minutos."
      );
      setState("error");
    }
    void run();
  }, [params, router]);

  function cleanUrl() {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.delete("preapproval_id");
    url.searchParams.delete("checkout");
    window.history.replaceState({}, "", url.toString());
  }

  function handleContinue() {
    cleanUrl();
    setState("idle");
    router.refresh();
  }

  if (state === "loading" && showOverlay) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
        <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-sky-100 bg-white p-8 text-center shadow-xl">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-100 border-t-sky-600" />
          <div>
            <p className="text-lg font-semibold">Procesando pago</p>
            <p className="mt-1 text-sm text-slate-500">
              Confirmando tu pago con Mercado Pago. No cierres esta página.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (state === "ok" && showOverlay) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
        <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-xl">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-7 w-7"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
          </div>
          <div>
            <p className="text-lg font-semibold text-emerald-700">
              Pago exitoso
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Tu pago fue acreditado y tu plan Pro ya está activo.
            </p>
          </div>
          <button
            onClick={handleContinue}
            className="mt-2 w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500"
          >
            Continuar
          </button>
        </div>
      </div>
    );
  }

  if (state === "ok" && !showOverlay) {
    return null;
  }

  if (state === "error") {
    return (
      <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error ?? "No pudimos activar tu suscripción."}
      </div>
    );
  }

  return null;
}

export function CheckoutActivator() {
  return (
    <Suspense>
      <ActivatorInner />
    </Suspense>
  );
}