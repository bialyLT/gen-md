import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <main className="flex w-full max-w-3xl flex-col items-center gap-6 py-16 text-center sm:gap-8 sm:py-24">
        <div className="flex flex-col items-center gap-3 sm:gap-4">
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
            Material didáctico con IA
          </h1>
          <p className="max-w-lg text-base text-zinc-600 sm:text-lg dark:text-zinc-400">
            Crea guías, planes de clase, presentaciones e imágenes para tus
            alumnos en minutos.
          </p>
        </div>
        <div className="flex w-full max-w-xs flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
          <Link
            href="/register"
            className="rounded-full bg-zinc-900 px-6 py-3 text-center text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            Crear cuenta
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-zinc-300 px-6 py-3 text-center text-sm font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Iniciar sesión
          </Link>
        </div>
      </main>
    </div>
  );
}