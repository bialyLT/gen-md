import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Verifica que el usuario esté logueado y sea ADMIN.
 * Se usa en las rutas API del panel de administración.
 */
export async function requireAdmin(): Promise<
  { ok: true; userId: string } | { ok: false; res: NextResponse }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      ok: false,
      res: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
    };
  }
  if (session.user.role !== "ADMIN") {
    return {
      ok: false,
      res: NextResponse.json({ error: "Prohibido" }, { status: 403 }),
    };
  }
  return { ok: true, userId: session.user.id };
}