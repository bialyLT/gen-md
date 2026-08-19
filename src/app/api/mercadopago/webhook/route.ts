import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getPayment,
  getSubscription,
  isMpConfigured,
} from "@/lib/mercadopago";

const PRO_PERIOD_DAYS = 30;

async function alreadyProcessed(eventId: string): Promise<boolean> {
  const existing = await prisma.webhookEvent.findUnique({ where: { eventId } });
  return Boolean(existing);
}

async function markProcessed(eventId: string) {
  await prisma.webhookEvent.create({
    data: { eventId, type: "processed", processed: true, processedAt: new Date() },
  });
}

async function activatePro(userId: string, paymentId: string, approvedAt?: string | null) {
  const now = approvedAt ? new Date(approvedAt) : new Date();
  const end = new Date(now.getTime() + PRO_PERIOD_DAYS * 24 * 60 * 60 * 1000);
  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      mpPaymentId: paymentId,
      status: "ACTIVE",
      plan: "PRO",
      currentPeriodStart: now,
      currentPeriodEnd: end,
    },
    update: {
      mpPaymentId: paymentId,
      status: "ACTIVE",
      plan: "PRO",
      currentPeriodStart: now,
      currentPeriodEnd: end,
    },
  });
  await prisma.user.update({ where: { id: userId }, data: { plan: "PRO" } });
}

/** Cobro de la suscripción (topic=payment). Activa PRO cuando se aprueba. */
async function handlePayment(paymentId: string) {
  const eventId = `mp-payment-${paymentId}`;
  if (await alreadyProcessed(eventId)) return;

  const payment = await getPayment(paymentId);
  if (!payment) {
    await markProcessed(eventId);
    return;
  }

  let userId = payment.external_reference ?? null;
  if (!userId && payment.preapproval_id) {
    const sub = await getSubscription(String(payment.preapproval_id));
    userId = sub?.external_reference ?? null;
    if (!userId) {
      const local = await prisma.subscription.findUnique({
        where: { mpPreferenceId: String(payment.preapproval_id) },
        select: { userId: true },
      });
      userId = local?.userId ?? null;
    }
  }

  if (userId && payment.status === "approved") {
    await activatePro(userId, String(payment.id), payment.date_approved);
  }

  await markProcessed(eventId);
}

/** Cambio de estado de la suscripción (topic=preapproval). */
async function handlePreapproval(preapprovalId: string) {
  const eventId = `mp-preapproval-${preapprovalId}`;
  if (await alreadyProcessed(eventId)) return;

  const sub = await getSubscription(preapprovalId);
  if (sub?.status === "cancelled" || sub?.status === "paused") {
    let userId = sub.external_reference ?? null;
    if (!userId) {
      const local = await prisma.subscription.findUnique({
        where: { mpPreferenceId: preapprovalId },
        select: { userId: true },
      });
      userId = local?.userId ?? null;
    }
    if (userId) {
      await prisma.subscription.updateMany({
        where: { userId },
        data: { status: "CANCELED", plan: "FREE" },
      });
      await prisma.user.update({
        where: { id: userId },
        data: { plan: "FREE" },
      });
    }
  }

  await markProcessed(eventId);
}

/**
 * Webhook de Mercado Pago (suscripciones). NO requiere sesión.
 * Idempotente vía WebhookEvent. Valida cada notificación consultando
 * el pago/suscripción con el access token.
 */
export async function POST(request: Request) {
  if (!isMpConfigured()) {
    return NextResponse.json({ received: true });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ received: true });
  }

  const url = new URL(request.url);
  const topic =
    url.searchParams.get("topic") ??
    url.searchParams.get("type") ??
    String(body.type ?? "") ??
    String(body.topic ?? "");

  const rawId =
    (body.data as { id?: unknown } | undefined)?.id ??
    body.id ??
    url.searchParams.get("data.id") ??
    url.searchParams.get("id");

  if (rawId == null) {
    return NextResponse.json({ received: true });
  }
  const id = String(rawId);

  try {
    if (topic === "payment") {
      await handlePayment(id);
    } else if (topic === "preapproval") {
      await handlePreapproval(id);
    }
  } catch (err) {
    console.error("Error procesando webhook de MercadoPago:", err);
    return NextResponse.json({ error: "Error interno al procesar" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}