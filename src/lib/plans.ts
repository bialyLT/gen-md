export type PlanKey = "FREE" | "PRO";
export type UsageKind = "GENERATION" | "IMAGE" | "CHAT_MESSAGE";

export interface UsageLimit {
  limit: number;
  /** "day" | "month" */
  period: "day" | "month";
}

export interface PlanConfig {
  label: string;
  priceMonthly: number;
  limits: Record<UsageKind, UsageLimit>;
  image: {
    provider: "fal" | "google";
    model: string;
  };
}

export const PLANS: Record<PlanKey, PlanConfig> = {
  FREE: {
    label: "Gratis",
    priceMonthly: 0,
    limits: {
      GENERATION: { limit: 3, period: "day" },
      IMAGE: { limit: 5, period: "day" },
      CHAT_MESSAGE: { limit: 20, period: "day" },
    },
    image: {
      provider: "fal",
      model: "fal-ai/flux/dev",
    },
  },
  PRO: {
    label: "Pro",
    priceMonthly: 15,
    limits: {
      GENERATION: { limit: 35, period: "day" },
      IMAGE: { limit: 150, period: "day" },
      CHAT_MESSAGE: { limit: 300, period: "day" },
    },
    image: {
      provider: "fal",
      model: "fal-ai/flux/dev",
    },
  },
};

export function getPlanConfig(plan: PlanKey): PlanConfig {
  return PLANS[plan] ?? PLANS.FREE;
}

export function periodKey(period: "day" | "month", date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  if (period === "month") {
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
  }
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate()
  )}`;
}