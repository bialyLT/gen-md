import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PlanCheckoutButton } from "@/components/plan-checkout-button";
import { LogoutButton } from "@/components/logout-button";

export const dynamic = "force-dynamic";

export default async function PlanesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const plans = await prisma.pricingPlan.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <main className="flex min-h-screen flex-col bg-zinc-50 p-6 dark:bg-black">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-zinc-500 transition hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            ← Volver al panel
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">Elegí tu plan</h1>
          <p className="text-sm text-zinc-500">
            Pagás de forma segura con Mercado Pago.
          </p>
        </div>
        <LogoutButton />
      </header>

      {plans.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Todavía no hay planes disponibles.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.id}
              className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <p className="font-medium">{p.name}</p>
              <p className="mt-1 text-3xl font-semibold">
                ${p.priceArs.toLocaleString("es-AR")}
                <span className="text-sm font-normal text-zinc-400">
                  {" "}
                  / {p.frequency} mes(es)
                </span>
              </p>
              {p.description && (
                <p className="mt-2 flex-1 text-sm text-zinc-500">
                  {p.description}
                </p>
              )}
              <div className="mt-4">
                <PlanCheckoutButton planId={p.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}