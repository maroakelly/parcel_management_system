import bcrypt from "bcryptjs";
import prisma from "./config/prisma";

async function createAdmin() {
  const name = "System Administrator";
  const email = "admin@parcelflow.com";
  const password = "Admin@12345";

  try {
    const existingAdmin = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingAdmin) {
      console.log("Admin account already exists.");
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const admin = await prisma.user.create({
      data: {
        name,
        email,
        phone: "0700000000",
        password: passwordHash,
        role: "ADMIN",
        status: "ACTIVE",
      },
    });

    console.log("Admin account created successfully.");
    console.log("Email:", admin.email);
    console.log("Password:", password);
    console.log("Role:", admin.role);
  } catch (error) {
    console.error("Error creating admin:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();