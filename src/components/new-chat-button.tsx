"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewChatButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const res = await fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Nuevo proyecto" }),
    });
    if (res.ok) {
      const { chat } = await res.json();
      router.push(`/chat/${chat.id}`);
    } else {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
    >
      {loading ? "Creando..." : "Nuevo proyecto"}
    </button>
  );
}