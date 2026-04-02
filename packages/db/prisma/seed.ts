import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import type { UserRole } from "@hitachi2/db";
import prisma from "@hitachi2/db";
import dotenv from "dotenv";

const envPath = path.join(__dirname, "../../apps/server/.env");
if (existsSync(envPath)) {
  dotenv.config({
    path: envPath,
  });
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password.normalize("NFKC"), salt, 64, {
    N: 16384,
    r: 16,
    p: 1,
    maxmem: 128 * 16384 * 16 * 2,
  });
  return `${salt}:${key.toString("hex")}`;
}

async function seedUser() {
  const email = "test@user.com";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`User ${email} already exists, skipping.`);
    return;
  }

  const userId = randomUUID();
  const accountId = randomUUID();
  const hashedPassword = hashPassword("Password123!");

  await prisma.user.create({
    data: {
      id: userId,
      name: "Default User",
      email,
      emailVerified: true,
    },
  });

  await prisma.account.create({
    data: {
      id: accountId,
      accountId: userId,
      providerId: "credential",
      userId,
      password: hashedPassword,
    },
  });

  console.log(`Created user: ${email}`);
}

async function seedParkingSpots() {
  const count = await prisma.parkingSpot.count();
  if (count >= 60) {
    console.log("Parking spots already seeded, skipping.");
    return;
  }

  const rows = ["A", "B", "C", "D", "E", "F"];
  const spots = rows.flatMap((row) =>
    Array.from({ length: 10 }, (_, i) => ({
      name: `${row}${String(i + 1).padStart(2, "0")}`,
      charger: row === "A" || row === "F",
      available: true,
    })),
  );

  await prisma.parkingSpot.createMany({ data: spots });
  console.log(`Created ${spots.length} parking spots.`);
}

async function seedCar() {
  const user = await prisma.user.findUnique({
    where: { email: "test@user.com" },
  });
  if (!user) {
    console.log("User not found, skipping car seed.");
    return;
  }

  const existing = await prisma.car.findFirst({ where: { userId: user.id } });
  if (existing) {
    console.log("Car already seeded, skipping.");
    return;
  }

  await prisma.car.create({
    data: {
      userId: user.id,
      name: "Voiture principale",
      licensePlate: "AA-001-AA",
      electric: false,
    },
  });
  console.log("Created car for test@user.com.");
}

async function seedTestUser(name: string, email: string, role: UserRole, electric = false) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`User ${email} already exists, skipping.`);
    return;
  }
  const userId = randomUUID();
  const accountId = randomUUID();
  const hashedPassword = hashPassword("Password123!");
  await prisma.user.create({
    data: { id: userId, name, email, emailVerified: true, role },
  });
  await prisma.account.create({
    data: {
      id: accountId,
      accountId: userId,
      providerId: "credential",
      userId,
      password: hashedPassword,
    },
  });
  await prisma.car.create({
    data: {
      userId,
      name: `${name} car`,
      licensePlate: `${name.slice(0, 2).toUpperCase()}-${role.slice(0, 2)}-${userId.slice(-4).toUpperCase()}`,
      electric,
    },
  });
  console.log(`Created user: ${email} (${role})`);
}

await seedUser();
await seedParkingSpots();
await seedCar();

await seedTestUser("Ken", "ken@test.com", "EMPLOYEE");
await seedTestUser("Ron", "ron@test.com", "EMPLOYEE");
await seedTestUser("Lenn", "lenn@test.com", "EMPLOYEE");
await seedTestUser("Alice", "alice@test.com", "MANAGER");
await seedTestUser("Bob", "bob@test.com", "MANAGER");
await seedTestUser("Carol", "carol@test.com", "MANAGER");
await seedTestUser("Dave", "dave@test.com", "SECRETARY");
await seedTestUser("Eve", "eve@test.com", "SECRETARY");
await seedTestUser("Frank", "frank@test.com", "SECRETARY");

await prisma.$disconnect();
