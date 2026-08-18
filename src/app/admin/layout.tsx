import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="flex flex-1 bg-zinc-50 dark:bg-black">
      <aside className="hidden w-64 flex-col border-r border-zinc-200 p-4 dark:border-zinc-800 md:flex">
        <Link href="/" className="mb-6 text-lg font-semibold">
          Material Didáctico
        </Link>
        <nav className="flex flex-col gap-1 text-sm">
          <Link
            href="/admin"
            className="rounded-lg px-3 py-2 text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Panel
          </Link>
          <Link
            href="/admin/plans"
            className="rounded-lg px-3 py-2 text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Planes
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg px-3 py-2 text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Volver al panel de usuario
          </Link>
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}