import { z } from "zod";

const envSchema = z.object({
  // Base
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),

  // Database
  DATABASE_URL: z.string().min(1),

  // NextAuth
  AUTH_SECRET: z.string().min(32),
  AUTH_URL: z.string().url().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  AUTH_TRUST_HOST: z.string().optional(),

  // LLM (chat) - compatible con OpenAI (cualquier proveedor)
  LLM_API_KEY: z.string().optional(),
  LLM_BASE_URL: z.string().url().optional(),
  LLM_MODEL: z.string().default("gpt-4o-mini"),

  // Image providers
  FAL_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),

  // Payments (Mercado Pago)
  MP_ACCESS_TOKEN: z.string().optional(),
  MP_WEBHOOK_URL: z.string().url().optional(),
  MP_PRICE_ARS: z.coerce.number().optional(),
  // Link de checkout del plan creado en el panel de Mercado Pago (sin integración).
  // Si está configurado, "Mejorar plan" redirige a este link y la activación
  // ocurre al volver con ?checkout=success&preapproval_id=...
  MP_PLAN_INIT_POINT: z.string().url().optional(),

  // Rate limiting
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Storage (CDN)
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "❌ Invalid environment variables:",
    JSON.stringify(parsed.error.flatten().fieldErrors, null, 2)
  );
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;