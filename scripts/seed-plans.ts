import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    const count = await prisma.pricingPlan.count();
    if (count > 0) {
      console.log(`Ya existen ${count} planes. No se agrega nada.`);
    } else {
      const plan = await prisma.pricingPlan.create({
        data: {
          name: "Pro",
          description:
            "Acceso ilimitado a generación de material didáctico, imágenes y chat.",
          priceArs: Number(process.env.MP_PRICE_ARS ?? 15000),
          frequency: 1,
          sortOrder: 0,
        },
      });
      console.log(`✅ Plan creado: ${plan.name} ($ ${plan.priceArs} ARS/mes)`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});