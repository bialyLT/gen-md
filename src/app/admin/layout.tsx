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
    <div className="flex flex-1 bg-sky-50/60">
      <aside className="hidden w-64 flex-col border-r border-sky-100 bg-white p-4 md:flex">
        <Link href="/" className="mb-6 text-lg font-semibold">
          Material Didáctico
        </Link>
        <nav className="flex flex-col gap-1 text-sm">
          <Link
            href="/admin"
            className="rounded-lg px-3 py-2 text-slate-600 transition hover:bg-sky-100"
          >
            Panel
          </Link>
          <Link
            href="/admin/plans"
            className="rounded-lg px-3 py-2 text-slate-600 transition hover:bg-sky-100"
          >
            Planes
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg px-3 py-2 text-slate-600 transition hover:bg-sky-100"
          >
            Volver al panel de usuario
          </Link>
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}