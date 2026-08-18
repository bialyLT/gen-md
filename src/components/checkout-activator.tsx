"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

function ActivatorInner() {
  const router = useRouter();
  const params = useSearchParams();
  const ran = useRef(false);
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">(
    "idle"
  );

  useEffect(() => {
    const preapprovalId = params.get("preapproval_id");
    const checkout = params.get("checkout");
    if (ran.current || !preapprovalId) return;
    ran.current = true;
    const id: string = preapprovalId;

    async function run() {
      if (checkout === "success") {
        setState("loading");
      }
      try {
        const res = await fetch(
          `/api/mercadopago/activate?preapproval_id=${encodeURIComponent(id)}`
        );
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setState("error");
          return;
        }
        setState("ok");
        router.refresh();
        if (checkout === "success") {
          const url = new URL(window.location.href);
          url.searchParams.delete("preapproval_id");
          url.searchParams.delete("checkout");
          window.history.replaceState({}, "", url.toString());
        }
      } catch {
        setState("error");
      }
    }
    void run();
  }, [params, router]);

  if (state === "ok") {
    return (
      <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
        Pago confirmado. Tu plan Pro está activo.
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
        No pudimos activar tu suscripción. Si el pago se acreditó, escribinos y
        lo activamos.
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
        Confirmando tu pago...
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