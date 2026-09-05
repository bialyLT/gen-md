import { prisma } from "@/lib/prisma";
import { BackButton } from "@/components/back-button";

export default async function AdminPage() {
  const [totalUsers, proUsers, plans, subscriptions, recentUsers] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { plan: "PRO" } }),
      prisma.pricingPlan.count({ where: { active: true } }),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, name: true, email: true, plan: true, role: true, createdAt: true },
      }),
    ]);

  const stats = [
    { label: "Usuarios totales", value: totalUsers },
    { label: "Usuarios Pro", value: proUsers },
    { label: "Planes activos", value: plans },
    { label: "Suscripciones activas", value: subscriptions },
  ];

  return (
    <div>
      <div className="mb-4">
        <BackButton href="/dashboard" label="Volver al panel" />
      </div>
      <h1 className="mb-6 text-xl font-semibold sm:text-2xl">Panel de administración</h1>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm sm:p-5"
          >
            <p className="text-xs text-slate-400">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-sky-100 bg-white shadow-sm">
        <h2 className="border-b border-sky-100 px-5 py-4 text-sm font-medium text-slate-500">
          Usuarios recientes
        </h2>
        <ul className="divide-y divide-sky-50">
          {recentUsers.map((u) => (
            <li
              key={u.id}
              className="flex items-center justify-between px-5 py-3 text-sm"
            >
              <div>
                <p className="font-medium">{u.name ?? "—"}</p>
                <p className="text-xs text-slate-400">{u.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {u.role === "ADMIN" && (
                  <span className="rounded bg-sky-100 px-2 py-0.5 text-xs text-sky-700">
                    Admin
                  </span>
                )}
                <span
                  className={`rounded px-2 py-0.5 text-xs ${
                    u.plan === "PRO"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {u.plan}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}