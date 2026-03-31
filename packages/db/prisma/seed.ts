import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({
  path: path.resolve(import.meta.dir, "../../../apps/server/.env"),
});

const { default: prisma } = await import("../src/index");

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

await seedUser();
await seedParkingSpots();
await prisma.$disconnect();
