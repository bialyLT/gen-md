"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Error al crear la cuenta.");
      setLoading(false);
      return;
    }

    router.push("/login?registered=1");
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="mb-6 text-2xl font-semibold">Crear cuenta</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            required
            placeholder="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Contraseña (mín. 8 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {loading ? "Creando..." : "Crear cuenta"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-zinc-500">
          ¿Ya tenés cuenta?{" "}
          <a href="/login" className="text-zinc-900 underline dark:text-zinc-100">
            Iniciá sesión
          </a>
        </p>
      </div>
    </div>
  );
}