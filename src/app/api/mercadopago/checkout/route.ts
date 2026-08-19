import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createSubscription, isMpConfigured } from "@/lib/mercadopago";
import { z } from "zod";

const bodySchema = z.object({ planId: z.string().min(1) });

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Falta el plan" }, { status: 400 });
  }

  const plan = await prisma.pricingPlan.findUnique({
    where: { id: parsed.data.planId },
  });
  if (!plan || !plan.active) {
    return NextResponse.json({ error: "Plan no disponible" }, { status: 404 });
  }

  // Si no hay token de MP, solo podemos redirigir al link del plan
  // (opción "sin integración").
  if (!isMpConfigured()) {
    if (plan.mpPlanInitPoint) {
      return NextResponse.json({ url: plan.mpPlanInitPoint });
    }
    return NextResponse.json(
      { error: "Mercado Pago no está configurado en el servidor" },
      { status: 503 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.data.userId },
  });
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }
  if (!user.email) {
    return NextResponse.json(
      { error: "Tu cuenta no tiene un email configurado para facturar" },
      { status: 400 }
    );
  }

  const appUrl = request.nextUrl.origin;
  const notificationUrl = `${appUrl}/api/mercadopago/webhook`;

  let id: string;
  let initPoint: string | null;
  try {
    ({ id, initPoint } = await createSubscription({
      userId: user.id,
      payerEmail: user.email,
      unitPrice: plan.priceArs,
      backUrl: `${appUrl}/dashboard`,
      notificationUrl,
    }));
  } catch (err) {
    // Si MP rechaza la creación por API (por ejemplo, algunos emails
    // de la propia cuenta de MP fallan), caemos al link del plan como
    // respaldo para no bloquear el pago.
    if (plan.mpPlanInitPoint) {
      return NextResponse.json({ url: plan.mpPlanInitPoint });
    }
    const message = err instanceof Error ? err.message : "Error desconocido";
    const isConfig = message.includes("resource not found");
    return NextResponse.json(
      {
        error: isConfig
          ? "La cuenta de Mercado Pago no tiene habilitado el producto Suscripciones. Activálo en Tus integraciones → la aplicación → Suscripciones."
          : "Mercado Pago rechazó la solicitud.",
        detail: message,
      },
      { status: 502 }
    );
  }

  await prisma.subscription.upsert({
    where: { userId: user.id },
    create: { userId: user.id, mpPreferenceId: id, status: "INCOMPLETE" },
    update: { mpPreferenceId: id, status: "INCOMPLETE" },
  });

  return NextResponse.json({ url: initPoint });
}