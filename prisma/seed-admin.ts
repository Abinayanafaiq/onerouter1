import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@onerouter.id").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "admin12345";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin already exists: ${email} (role: ${existing.role})`);
    await prisma.user.update({ where: { email }, data: { role: "ADMIN" } });
    console.log("  → role updated to ADMIN");
  } else {
    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: { email, password: hashed, name: "Admin", role: "ADMIN" },
    });
    console.log(`Admin created: ${email} / role: ADMIN`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});