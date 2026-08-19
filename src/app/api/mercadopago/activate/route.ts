import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import {
  getPayment,
  getSubscription,
  isMpConfigured,
} from "@/lib/mercadopago";

export const maxDuration = 60;

const PRO_PERIOD_DAYS = 30;

const APPROVED_STATUSES = new Set(["approved", "authorized"]);

async function activatePro(
  userId: string,
  preapprovalId: string,
  paymentId?: string | null
) {
  const now = new Date();
  const end = new Date(now.getTime() + PRO_PERIOD_DAYS * 24 * 60 * 60 * 1000);
  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      mpPreferenceId: preapprovalId,
      mpPaymentId: paymentId ?? null,
      status: "ACTIVE",
      plan: "PRO",
      currentPeriodStart: now,
      currentPeriodEnd: end,
    },
    update: {
      mpPreferenceId: preapprovalId,
      mpPaymentId: paymentId ?? undefined,
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
 * La suscripción local (creada en /checkout por el flujo API) debe
 * pertenecer al cliente que confirma. Si no existe una local, la
 * preapproval la creó el link del plan ("sin integración") y MP no la
 * vincula a un usuario (external_reference es una constante y no hay
 * payer_email). En ese caso confiamos en la sesión: quien volvió con
 * este preapproval_id en la URL es el cliente que acaba de pagar.
 */
async function assertOwnership(userId: string, preapprovalId: string) {
  const localSub = await prisma.subscription.findUnique({
    where: { mpPreferenceId: preapprovalId },
    select: { userId: true },
  });
  if (localSub && localSub.userId !== userId) {
    return false;
  }
  return true;
}

/**
 * Activa PRO cuando el usuario vuelve del checkout de Mercado Pago.
 * MP redirige a /dashboard con los datos del pago como query params
 * (preapproval_id, y opcionalmente status/collection_status/payment_id).
 * Activa apenas el pago está aprobado, consultando MP de ser necesario.
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
  const paymentId = searchParams.get("payment_id");
  const statusParam =
    searchParams.get("status") ?? searchParams.get("collection_status");

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

  // El status viene en la URL de retorno. Si MP ya confirmó el pago,
  // activamos directo sin esperar el polling de la preapproval.
  if (statusParam && APPROVED_STATUSES.has(statusParam)) {
    if (await assertOwnership(auth.data.userId, preapprovalId)) {
      await activatePro(auth.data.userId, preapprovalId, paymentId);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json(
      { error: "Esta suscripción pertenece a otra cuenta." },
      { status: 403 }
    );
  }

  // Si vino un payment_id, verificamos el pago puntual en MP.
  if (paymentId) {
    const payment = await getPayment(paymentId);
    if (payment?.status === "approved") {
      if (await assertOwnership(auth.data.userId, preapprovalId)) {
        await activatePro(auth.data.userId, preapprovalId, paymentId);
        return NextResponse.json({ ok: true });
      }
      return NextResponse.json(
        { error: "Esta suscripción pertenece a otra cuenta." },
        { status: 403 }
      );
    }
  }

  // Sin datos de pago en la URL: consultamos la preapproval. "authorized":
  // primer cobro aprobado. "pending": el cliente se adhirió pero el cobro
  // inicial está pendiente de acreditarse. Reintentamos unos segundos.
  const sub = await getSubscription(preapprovalId);
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
    console.warn(
      `[mercadopago/activate] pago no confirmado. preapproval=${preapprovalId} status=${currentStatus ?? "null"} params=${searchParams.toString()}`
    );
    return NextResponse.json(
      {
        error: `El pago todavía no se confirma (estado en Mercado Pago: ${currentStatus ?? "desconocido"}). Si ya pagaste, tu plan se activa automáticamente en unos minutos.`,
      },
      { status: 400 }
    );
  }

  if (!(await assertOwnership(auth.data.userId, preapprovalId))) {
    return NextResponse.json(
      { error: "Esta suscripción pertenece a otra cuenta." },
      { status: 403 }
    );
  }

  await activatePro(auth.data.userId, preapprovalId, paymentId);
  return NextResponse.json({ ok: true });
}