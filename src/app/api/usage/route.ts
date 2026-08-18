import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { getQuota } from "@/lib/quota";
import { prisma } from "@/lib/prisma";
import { PLANS, type UsageKind } from "@/lib/plans";

const KINDS: UsageKind[] = ["GENERATION", "IMAGE", "CHAT_MESSAGE"];

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const plan = auth.data.plan;

  const quotas = {} as Record<UsageKind, { used: number; limit: number; remaining: number }>;
  for (const kind of KINDS) {
    const q = await getQuota(auth.data.userId, plan, kind);
    quotas[kind] = { used: q.used, limit: q.limit, remaining: q.remaining };
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId: auth.data.userId },
  });

  const planInfo = PLANS[plan];

  return NextResponse.json({
    plan,
    planInfo: {
      label: planInfo.label,
      priceMonthly: planInfo.priceMonthly,
      limits: planInfo.limits,
    },
    quotas,
    subscription: subscription
      ? {
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd,
        }
      : null,
  });
}