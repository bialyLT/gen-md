import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const email = process.argv[2];
if (!email) {
  console.error("Uso: npm run db:admin <email>");
  process.exit(1);
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  try {
    const user = await prisma.user.update({
      where: { email },
      data: { role: "ADMIN" },
    });
    console.log(`✅ ${user.email} ahora es ADMIN`);
  } catch {
    console.error(`❌ No se encontró ningún usuario con email ${email}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});