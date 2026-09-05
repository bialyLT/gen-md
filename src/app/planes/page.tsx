import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PlanCheckoutButton } from "@/components/plan-checkout-button";
import { LogoutButton } from "@/components/logout-button";
import { BackButton } from "@/components/back-button";

export const dynamic = "force-dynamic";

export default async function PlanesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const plans = await prisma.pricingPlan.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <main className="flex min-h-screen flex-col bg-sky-50/60 p-4 sm:p-6">
      <header className="mb-6 flex items-start justify-between gap-3 sm:mb-8 sm:items-center">
        <div className="min-w-0">
          <BackButton href="/dashboard" label="Volver al panel" />
          <h1 className="mt-1 text-xl font-semibold sm:text-2xl">
            Elegí tu plan
          </h1>
          <p className="text-sm text-slate-500">
            Pagás de forma segura con Mercado Pago.
          </p>
        </div>
        <LogoutButton />
      </header>

      {plans.length === 0 ? (
        <p className="text-sm text-slate-500">
          Todavía no hay planes disponibles.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.id}
              className="flex flex-col rounded-xl border border-sky-100 bg-white p-4 shadow-sm sm:p-5"
            >
              <p className="font-medium text-slate-900">{p.name}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900 sm:text-3xl">
                ${p.priceArs.toLocaleString("es-AR")}
                <span className="text-sm font-normal text-slate-400">
                  {" "}
                  / {p.frequency} mes(es)
                </span>
              </p>
              {p.description && (
                <p className="mt-2 flex-1 text-sm text-slate-500">
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