import bcrypt from "bcryptjs";
import prisma from "../src/config/prisma";

async function main() {
  const passwordHash = await bcrypt.hash("Admin@12345", 10);

  const admin = await prisma.user.upsert({
    where: {
      email: "admin@parcelflow.com",
    },
    update: {
      name: "ParcelFlow Administrator",
      password: passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
    create: {
      name: "ParcelFlow Administrator",
      email: "admin@parcelflow.com",
      password: passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  console.log("Permanent admin account created/updated:");
  console.log({
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    status: admin.status,
  });
}

main()
  .catch((error) => {
    console.error("Admin seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });