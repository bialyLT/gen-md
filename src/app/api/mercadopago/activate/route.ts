import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getSubscription, isMpConfigured } from "@/lib/mercadopago";

const PRO_PERIOD_DAYS = 30;

/**
 * Activa PRO cuando el usuario vuelve del checkout de Mercado Pago
 * (plan creado en el panel, opción "sin integración").
 * El redirect de MP llega a /dashboard?checkout=success&preapproval_id=...
 */
export async function GET(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  if (!isMpConfigured()) {
    return NextResponse.json(
      { error: "Mercado Pago no está configurado" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const preapprovalId = searchParams.get("preapproval_id");

  if (!preapprovalId) {
    return NextResponse.json(
      { error: "Falta preapproval_id" },
      { status: 400 }
    );
  }

  const sub = await getSubscription(preapprovalId);
  const status = sub?.status;
  // "authorized": primer cobro aprobado. "pending": el cliente ya se
  // adhirió pero el cobro inicial está pendiente de acreditarse.
  // Al volver del checkout el cobro puede tardar unos segundos en
  // confirmarse, así que reintentamos antes de fallar.
  let currentSub = sub;
  let currentStatus = status;
  for (let i = 0; i < 5 && (!currentSub || (currentStatus !== "authorized" && currentStatus !== "pending")); i++) {
    await new Promise((r) => setTimeout(r, 4000));
    currentSub = await getSubscription(preapprovalId);
    currentStatus = currentSub?.status;
  }

  if (
    !currentSub ||
    (currentStatus !== "authorized" && currentStatus !== "pending")
  ) {
    return NextResponse.json(
      { error: "La suscripción no está activa" },
      { status: 400 }
    );
  }

  const now = new Date();
  const end = new Date(now.getTime() + PRO_PERIOD_DAYS * 24 * 60 * 60 * 1000);

  await prisma.subscription.upsert({
    where: { userId: auth.data.userId },
    create: {
      userId: auth.data.userId,
      mpPreferenceId: preapprovalId,
      status: "ACTIVE",
      plan: "PRO",
      currentPeriodStart: now,
      currentPeriodEnd: end,
    },
    update: {
      mpPreferenceId: preapprovalId,
      status: "ACTIVE",
      plan: "PRO",
      currentPeriodStart: now,
      currentPeriodEnd: end,
    },
  });

  await prisma.user.update({
    where: { id: auth.data.userId },
    data: { plan: "PRO" },
  });

  return NextResponse.json({ ok: true });
}