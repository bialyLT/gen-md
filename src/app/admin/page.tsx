import { prisma } from "@/lib/prisma";

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
      <h1 className="mb-6 text-2xl font-semibold">Panel de administración</h1>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <p className="text-xs text-zinc-400">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="border-b border-zinc-200 px-5 py-4 text-sm font-medium text-zinc-500 dark:border-zinc-800">
          Usuarios recientes
        </h2>
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {recentUsers.map((u) => (
            <li
              key={u.id}
              className="flex items-center justify-between px-5 py-3 text-sm"
            >
              <div>
                <p className="font-medium">{u.name ?? "—"}</p>
                <p className="text-xs text-zinc-400">{u.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {u.role === "ADMIN" && (
                  <span className="rounded bg-zinc-200 px-2 py-0.5 text-xs dark:bg-zinc-800">
                    Admin
                  </span>
                )}
                <span
                  className={`rounded px-2 py-0.5 text-xs ${
                    u.plan === "PRO"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200"
                      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
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