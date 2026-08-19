import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getSubscription, isMpConfigured } from "@/lib/mercadopago";

export const maxDuration = 60;

const PRO_PERIOD_DAYS = 30;

async function activatePro(userId: string, preapprovalId: string) {
  const now = new Date();
  const end = new Date(now.getTime() + PRO_PERIOD_DAYS * 24 * 60 * 60 * 1000);
  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
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
    where: { id: userId },
    data: { plan: "PRO" },
  });
}

async function isAlreadyActive(userId: string): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { status: true, plan: true },
  });
  return sub?.status === "ACTIVE" && sub.plan === "PRO";
}

/**
 * Activa PRO cuando el usuario vuelve del checkout de Mercado Pago.
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

  // Idempotencia: si el pago ya se acreditó (por ejemplo vía webhook),
  // no fallamos aunque el estado en MP todavía no se refleje.
  if (await isAlreadyActive(auth.data.userId)) {
    return NextResponse.json({ ok: true });
  }

  const sub = await getSubscription(preapprovalId);
  // "authorized": primer cobro aprobado. "pending": el cliente ya se
  // adhirió pero el cobro inicial está pendiente de acreditarse.
  // Al volver del checkout el cobro puede tardar unos segundos en
  // confirmarse, así que reintentamos antes de fallar.
  let currentSub = sub;
  let currentStatus = sub?.status;
  for (
    let i = 0;
    i < 6 &&
    (!currentSub ||
      (currentStatus !== "authorized" && currentStatus !== "pending"));
    i++
  ) {
    await new Promise((r) => setTimeout(r, 4000));
    currentSub = await getSubscription(preapprovalId);
    currentStatus = currentSub?.status;
  }

  if (
    !currentSub ||
    (currentStatus !== "authorized" && currentStatus !== "pending")
  ) {
    // Último chequeo: el webhook pudo acreditarlo mientras tanto.
    if (await isAlreadyActive(auth.data.userId)) {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json(
      {
        error:
          "El pago todavía no se confirma. Si ya pagaste, tu plan se activa automáticamente en unos minutos.",
      },
      { status: 400 }
    );
  }

  // La preapproval se creó con external_reference = userId. Si tiene un
  // dueño distinto al cliente que está confirmando, la rechazamos para
  // no acreditar el plan a otra cuenta. (Los links "sin integración" no
  // setean external_reference, así que se permiten.)
  if (
    currentSub.external_reference &&
    currentSub.external_reference !== auth.data.userId
  ) {
    return NextResponse.json(
      { error: "Esta suscripción pertenece a otra cuenta." },
      { status: 403 }
    );
  }

  await activatePro(auth.data.userId, preapprovalId);
  return NextResponse.json({ ok: true });
}