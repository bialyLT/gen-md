import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 dark:bg-black px-6">
      <main className="flex w-full max-w-3xl flex-col items-center gap-8 py-24 text-center">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Material didáctico con IA
          </h1>
          <p className="max-w-lg text-lg text-zinc-600 dark:text-zinc-400">
            Crea guías, planes de clase, presentaciones e imágenes para tus
            alumnos en minutos.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/register"
            className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            Crear cuenta
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Iniciar sesión
          </Link>
        </div>
      </main>
    </div>
  );
}