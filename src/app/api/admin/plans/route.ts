import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const planInputSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  priceArs: z.coerce.number().int().min(1).max(100_000_000),
  frequency: z.coerce.number().int().min(1).max(12).default(1),
  mpPlanInitPoint: z.string().url().optional().nullable(),
  mpPlanId: z.string().max(200).optional().nullable(),
  active: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export type PlanInput = z.infer<typeof planInputSchema>;

/** Lista todos los planes (activos e inactivos). */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  const plans = await prisma.pricingPlan.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ plans });
}

/** Crea un plan. */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  const body = await request.json().catch(() => null);
  const parsed = planInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const plan = await prisma.pricingPlan.create({
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

  return NextResponse.json({ plan }, { status: 201 });
}