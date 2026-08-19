import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

/**
 * Diagnóstico de la conexión con Mercado Pago desde el entorno de
 * producción. Requiere sesión (cualquier usuario autenticado). Devuelve
 * si el token existe, su tipo (TEST/APP_USR), si es válido consultando
 * /users/me, y (opcional) si puede leer la preapproval indicada en
 * ?preapproval_id=.
 */
export async function GET(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const token = process.env.MP_ACCESS_TOKEN;

  if (!token) {
    return NextResponse.json({
      configured: false,
      message: "MP_ACCESS_TOKEN no está configurado en este entorno.",
    });
  }

  const tokenPrefix = token.startsWith("TEST-")
    ? "TEST"
    : token.startsWith("APP_USR-")
      ? "APP_USR"
      : "OTRO";

  const meRes = await fetch("https://api.mercadopago.com/users/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const meBody = await meRes.json().catch(() => null);

  const { searchParams } = new URL(request.url);
  const preapprovalId = searchParams.get("preapproval_id");

  let preapproval = null;
  if (preapprovalId) {
    const paRes = await fetch(
      `https://api.mercadopago.com/preapproval/${preapprovalId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const paBody = await paRes.json().catch(() => null);
    preapproval = {
      httpStatus: paRes.status,
      status: paRes.ok ? paBody?.status ?? null : null,
      external_reference: paRes.ok ? paBody?.external_reference ?? null : null,
      error: paRes.ok ? null : paBody?.message ?? paRes.statusText,
    };
  }

  return NextResponse.json({
    configured: true,
    tokenPrefix,
    usersMe: {
      httpStatus: meRes.status,
      id: meRes.ok ? meBody?.id ?? null : null,
      nickname: meRes.ok ? meBody?.nickname ?? null : null,
      user_type: meRes.ok ? meBody?.user_type ?? null : null,
      site_id: meRes.ok ? meBody?.site_id ?? null : null,
      error: meRes.ok ? null : meBody?.message ?? meRes.statusText,
    },
    preapproval,
  });
}