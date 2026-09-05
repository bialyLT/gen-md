import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-sky-100 via-white to-amber-50 px-4">
      <main className="flex w-full max-w-3xl flex-col items-center gap-6 py-16 text-center sm:gap-8 sm:py-24">
        <div className="flex flex-col items-center gap-3 sm:gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Material didáctico con IA
          </h1>
          <p className="max-w-lg text-base text-slate-600 sm:text-lg">
            Crea guías, planes de clase, presentaciones e imágenes para tus
            alumnos en minutos.
          </p>
        </div>
        <div className="flex w-full max-w-xs flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
          <Link
            href="/register"
            className="rounded-full bg-sky-600 px-6 py-3 text-center text-sm font-medium text-white shadow-sm transition hover:bg-sky-500"
          >
            Crear cuenta
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-sky-200 bg-white px-6 py-3 text-center text-sm font-medium text-sky-700 transition hover:bg-sky-50"
          >
            Iniciar sesión
          </Link>
        </div>
      </main>
    </div>
  );
}