"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  chatId: string;
  /** true cuando se muestra dentro de la vista del chat (redirige al panel) */
  inChat?: boolean;
  compact?: boolean;
}

export function DeleteChatButton({ chatId, inChat = false, compact = false }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!window.confirm("¿Eliminar este proyecto? Esta acción no se puede deshacer.")) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/chats/${chatId}`, { method: "DELETE" });
      if (res.ok) {
        if (inChat) {
          router.push("/dashboard");
        } else {
          router.refresh();
        }
      }
    } finally {
      setLoading(false);
    }
  }

  if (compact) {
    return (
      <button
        onClick={handleDelete}
        disabled={loading}
        title="Eliminar proyecto"
        className="rounded-md p-1 text-zinc-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-950"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6h18" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    );
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-40 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
    >
      {loading ? "..." : "Eliminar"}
    </button>
  );
}