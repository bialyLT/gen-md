import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import {
  createSubscription,
  isMpConfigured,
  mpPriceArs,
} from "@/lib/mercadopago";

export async function POST() {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  if (!isMpConfigured()) {
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

  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  const notificationUrl =
    process.env.MP_WEBHOOK_URL ?? `${appUrl}/api/mercadopago/webhook`;

  let id: string;
  let initPoint: string | null;
  try {
    ({ id, initPoint } = await createSubscription({
      userId: user.id,
      payerEmail: user.email,
      unitPrice: mpPriceArs(),
      backUrl: `${appUrl}/dashboard`,
      notificationUrl,
    }));
  } catch (err) {
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