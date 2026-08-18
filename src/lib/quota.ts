import { prisma } from "@/lib/prisma";
import { getPlanConfig, periodKey, type UsageKind } from "@/lib/plans";

export interface QuotaResult {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
}

/**
 * Verifica e incrementa la cuota del usuario para una acción dada.
 * Los contadores son durables en la BD (por día o por mes), independientes
 * del rate limiting transitorio (Upstash).
 */
export async function consumeQuota(
  userId: string,
  plan: "FREE" | "PRO",
  kind: UsageKind
): Promise<QuotaResult> {
  const config = getPlanConfig(plan);
  const limit = config.limits[kind];
  const key = periodKey(limit.period);

  const record = await prisma.usageRecord.upsert({
    where: {
      userId_kind_period: { userId, kind, period: key },
    },
    create: { userId, kind, period: key, count: 1 },
    update: { count: { increment: 1 } },
    select: { count: true },
  });

  const used = record.count;
  const allowed = used <= limit.limit;

  return { allowed, used, limit: limit.limit, remaining: Math.max(0, limit.limit - used) };
}

/** Consulta la cuota sin incrementarla (para mostrar en el dashboard). */
export async function getQuota(
  userId: string,
  plan: "FREE" | "PRO",
  kind: UsageKind
): Promise<QuotaResult> {
  const config = getPlanConfig(plan);
  const limit = config.limits[kind];
  const key = periodKey(limit.period);

  const record = await prisma.usageRecord.findUnique({
    where: {
      userId_kind_period: { userId, kind, period: key },
    },
    select: { count: true },
  });

  const used = record?.count ?? 0;
  return {
    allowed: used < limit.limit,
    used,
    limit: limit.limit,
    remaining: Math.max(0, limit.limit - used),
  };
}