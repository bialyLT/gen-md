"use client";

import { useRouter } from "next/navigation";

interface Props {
  /** Destino al que ir si no hay historial para volver (ej. llegada directa). */
  href?: string;
  label?: string;
}

export function BackButton({ href = "/", label = "Volver" }: Props) {
  const router = useRouter();

  function handleClick() {
    const idx = (window.history.state as { idx?: number } | null)?.idx;
    if (typeof idx === "number" && idx > 0) {
      router.back();
    } else {
      router.push(href);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="text-sm text-sky-700 transition hover:text-sky-500"
    >
      ← {label}
    </button>
  );
}