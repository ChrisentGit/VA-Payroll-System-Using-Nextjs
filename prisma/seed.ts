import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("change-me-immediately", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@yourcompany.com" },
    update: {},
    create: {
      name: "CEO Admin",
      email: "admin@yourcompany.com",
      passwordHash,
      role: "SUPER_ADMIN",
    },
  });

  console.log("Seeded admin user:", admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });