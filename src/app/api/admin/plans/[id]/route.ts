import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { planInputSchema } from "../route";

type Params = { params: Promise<{ id: string }> };

/** Actualiza un plan. */
export async function PUT(request: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = planInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const exists = await prisma.pricingPlan.findUnique({ where: { id } });
  if (!exists) {
    return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
  }

  const plan = await prisma.pricingPlan.update({
    where: { id },
    data: {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      priceArs: parsed.data.priceArs,
      frequency: parsed.data.frequency,
      mpPlanInitPoint: parsed.data.mpPlanInitPoint ?? null,
      mpPlanId: parsed.data.mpPlanId ?? null,
      active: parsed.data.active,
      sortOrder: parsed.data.sortOrder,
    },
  });

  return NextResponse.json({ plan });
}

/** Elimina un plan. */
export async function DELETE(_request: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  const { id } = await params;
  const exists = await prisma.pricingPlan.findUnique({ where: { id } });
  if (!exists) {
    return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
  }

  await prisma.pricingPlan.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}