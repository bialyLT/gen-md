const MP_API = "https://api.mercadopago.com";

export interface MpPayment {
  id: number;
  status: string; // approved, pending, cancelled, rejected, refunded, ...
  status_detail?: string;
  external_reference?: string | null;
  preapproval_id?: string | null;
  date_approved?: string | null;
  transaction_amount?: number;
}

export interface MpPreapproval {
  id: string;
  init_point?: string | null;
  status?: string; // pending, authorized, paused, cancelled, ...
  external_reference?: string | null;
  next_payment_date?: string | null;
  auto_recurring?: {
    frequency?: number;
    frequency_type?: string;
    transaction_amount?: number;
    currency_id?: string;
  };
}

export function isMpConfigured(): boolean {
  return Boolean(process.env.MP_ACCESS_TOKEN);
}

/**
 * Link de checkout del plan creado manualmente en el panel de Mercado Pago
 * (opción "sin integración"). Si está configurado, "Mejorar plan" redirige
 * directo a ese link en vez de crear la suscripción por API.
 */
export function mpPlanInitPoint(): string | null {
  return process.env.MP_PLAN_INIT_POINT ?? null;
}

/** Precio mensual del plan Pro en pesos argentinos. */
export function mpPriceArs(): number {
  const value = Number(process.env.MP_PRICE_ARS);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 15000;
}

/**
 * Crea una suscripción (preapproval) de Mercado Pago y devuelve la URL
 * donde el usuario autoriza el cobro mensual con su tarjeta.
 */
export async function createSubscription(params: {
  userId: string;
  payerEmail: string;
  unitPrice: number;
  backUrl: string;
  notificationUrl: string;
  reason?: string;
}): Promise<{ id: string; initPoint: string | null }> {
  const res = await fetch(`${MP_API}/preapproval`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      payer_email: params.payerEmail,
      reason: params.reason ?? "Plan Pro - Material Didáctico (suscripción mensual)",
      external_reference: params.userId,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: params.unitPrice,
        currency_id: "ARS",
      },
      back_url: params.backUrl,
      notification_url: params.notificationUrl,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(
      `MercadoPago create subscription failed (${res.status}): ${detail.slice(0, 300)}`
    );
  }

  const data = (await res.json()) as MpPreapproval;
  return { id: data.id, initPoint: data.init_point ?? null };
}

/** Consulta el detalle de una suscripción (preapproval). */
export async function getSubscription(
  subscriptionId: string
): Promise<MpPreapproval | null> {
  const res = await fetch(`${MP_API}/preapproval/${subscriptionId}`, {
    headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as MpPreapproval;
}

/** Consulta el detalle de un pago (cobro puntual o de suscripción). */
export async function getPayment(paymentId: string): Promise<MpPayment | null> {
  const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as MpPayment;
}