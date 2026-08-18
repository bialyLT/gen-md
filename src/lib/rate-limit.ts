import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

const hasRedis = Boolean(url && token);

// Límites de ráfaga (anti-abuso). La cuota de negocio se maneja en lib/quota.ts.
const limiter = hasRedis
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(30, "10 s"),
      analytics: true,
      prefix: "ratelimit",
    })
  : null;

export async function rateLimit(identifier: string) {
  if (!limiter) {
    if (process.env.NODE_ENV !== "production") {
      return { success: true, remaining: Number.MAX_SAFE_INTEGER, limit: 30 };
    }
    // En producción sin Upstash configurado, falla cerrado (seguro).
    return { success: false, remaining: 0, limit: 30 };
  }
  return limiter.limit(identifier);
}