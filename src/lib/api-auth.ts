import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { rateLimit } from "@/lib/rate-limit";
import type { Session } from "next-auth";

export interface Authed {
  session: Session;
  userId: string;
  plan: "FREE" | "PRO";
}

/**
 * Verifica sesión + rate limit de ráfaga.
 * Devuelve la sesión o una respuesta de error tipada.
 */
export async function requireUser(): Promise<
  { ok: true; data: Authed } | { ok: false; res: NextResponse }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      ok: false,
      res: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
    };
  }

  const rl = await rateLimit(session.user.id);
  if (!rl.success) {
    return {
      ok: false,
      res: NextResponse.json(
        { error: "Demasiadas solicitudes. Intenta en unos segundos." },
        { status: 429, headers: { "Retry-After": "10" } }
      ),
    };
  }

  return {
    ok: true,
    data: {
      session,
      userId: session.user.id,
      plan: session.user.plan ?? "FREE",
    },
  };
}