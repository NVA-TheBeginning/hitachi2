import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { toReservationDate } from "@api/helpers";
import prisma from "@hitachi2/db";
import { call } from "@orpc/server";

import { appRouter } from "../../src/routers/index";

const USER_1 = {
  id: "test-account-user-1",
  name: "Account User 1",
  email: "test-account-user-1@test.com",
  emailVerified: true as const,
  role: "EMPLOYEE" as const,
};

const USER_2 = {
  id: "test-account-user-2",
  name: "Account User 2",
  email: "test-account-user-2@test.com",
  emailVerified: true as const,
  role: "MANAGER" as const,
};

const CAR_1 = {
  id: "test-account-car-1",
  userId: USER_1.id,
  name: "Voiture principale",
  licensePlate: "ACC-001-AA",
  electric: false,
};

const CAR_2 = {
  id: "test-account-car-2",
  userId: USER_2.id,
  name: "Voiture manager",
  licensePlate: "ACC-002-AA",
  electric: true,
};

const SPOT = {
  id: "test-account-spot-1",
  name: "TEST-ACCOUNT-A01",
  charger: false,
  available: true,
};

function createAuthedContext(user: typeof USER_1) {
  return {
    context: {
      session: {
        session: {
          id: `session-${user.id}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: user.id,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60),
          token: `token-${user.id}`,
          ipAddress: "127.0.0.1",
          userAgent: "bun-test",
        },
        user: {
          id: user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
          email: user.email,
          emailVerified: user.emailVerified,
          name: user.name,
          image: null,
        },
      },
      jobQueue: { send: async () => null },
    },
  };
}

const unauthenticatedContext = {
  context: {
    session: null,
    jobQueue: { send: async () => null },
  },
};

beforeAll(async () => {
  await prisma.reservation.deleteMany({
    where: {
      OR: [{ carId: CAR_1.id }, { carId: CAR_2.id }],
    },
  });
  await prisma.parkingSpot.deleteMany({ where: { id: SPOT.id } });
  await prisma.car.deleteMany({
    where: {
      id: {
        in: [CAR_1.id, CAR_2.id],
      },
    },
  });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [USER_1.id, USER_2.id],
      },
    },
  });
});

beforeEach(async () => {
  await prisma.reservation.deleteMany({
    where: {
      OR: [{ carId: CAR_1.id }, { carId: CAR_2.id }],
    },
  });

  await prisma.user.upsert({
    where: { id: USER_1.id },
    update: {
      name: USER_1.name,
      email: USER_1.email,
      emailVerified: USER_1.emailVerified,
      role: USER_1.role,
    },
    create: USER_1,
  });

  await prisma.user.upsert({
    where: { id: USER_2.id },
    update: {
      name: USER_2.name,
      email: USER_2.email,
      emailVerified: USER_2.emailVerified,
      role: USER_2.role,
    },
    create: USER_2,
  });

  await prisma.car.upsert({
    where: { id: CAR_1.id },
    update: {
      userId: CAR_1.userId,
      name: CAR_1.name,
      licensePlate: CAR_1.licensePlate,
      electric: CAR_1.electric,
    },
    create: CAR_1,
  });

  await prisma.car.upsert({
    where: { id: CAR_2.id },
    update: {
      userId: CAR_2.userId,
      name: CAR_2.name,
      licensePlate: CAR_2.licensePlate,
      electric: CAR_2.electric,
    },
    create: CAR_2,
  });

  await prisma.car.deleteMany({
    where: {
      userId: USER_1.id,
      id: {
        notIn: [CAR_1.id],
      },
    },
  });

  await prisma.parkingSpot.upsert({
    where: { id: SPOT.id },
    update: {
      name: SPOT.name,
      charger: SPOT.charger,
      available: SPOT.available,
    },
    create: SPOT,
  });
});

afterAll(async () => {
  await prisma.reservation.deleteMany({
    where: {
      OR: [{ carId: CAR_1.id }, { carId: CAR_2.id }],
    },
  });
  await prisma.parkingSpot.deleteMany({ where: { id: SPOT.id } });
  await prisma.car.deleteMany({
    where: {
      userId: {
        in: [USER_1.id, USER_2.id],
      },
    },
  });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [USER_1.id, USER_2.id],
      },
    },
  });
});

describe("account routes", () => {
  test("should return the authenticated account with its cars", async () => {
    const result = await call(
      appRouter.getMyAccount,
      undefined,
      createAuthedContext(USER_1),
    );

    expect(result.id).toBe(USER_1.id);
    expect(result.name).toBe(USER_1.name);
    expect(result.email).toBe(USER_1.email);
    expect(result.cars).toHaveLength(1);
    expect(result.cars[0]?.id).toBe(CAR_1.id);
    expect(result.cars[0]?.licensePlate).toBe(CAR_1.licensePlate);
  });

  test("should throw UNAUTHORIZED when account is not authenticated", async () => {
    await expect(
      call(appRouter.getMyAccount, undefined, unauthenticatedContext),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  test("should update the authenticated account name", async () => {
    const result = await call(
      appRouter.updateMyAccount,
      { name: "Nouvel utilisateur" },
      createAuthedContext(USER_1),
    );

    expect(result.name).toBe("Nouvel utilisateur");

    const updatedUser = await prisma.user.findUniqueOrThrow({
      where: { id: USER_1.id },
    });
    expect(updatedUser.name).toBe("Nouvel utilisateur");
  });

  test("should create a new car for the authenticated account", async () => {
    const result = await call(
      appRouter.createMyCar,
      {
        name: "Voiture secondaire",
        licensePlate: "ab-123-cd",
        electric: true,
      },
      createAuthedContext(USER_1),
    );

    expect(result.name).toBe("Voiture secondaire");
    expect(result.licensePlate).toBe("AB-123-CD");
    expect(result.electric).toBe(true);

    const cars = await prisma.car.findMany({
      where: { userId: USER_1.id },
      orderBy: { createdAt: "asc" },
    });
    expect(cars).toHaveLength(2);
  });

  test("should reject a duplicate license plate", async () => {
    await expect(
      call(
        appRouter.createMyCar,
        {
          name: "Voiture duplicate",
          licensePlate: CAR_2.licensePlate.toLowerCase(),
          electric: false,
        },
        createAuthedContext(USER_1),
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  test("should update an owned car", async () => {
    const result = await call(
      appRouter.updateMyCar,
      {
        carId: CAR_1.id,
        name: "Voiture mise a jour",
        licensePlate: "zz-999-zz",
        electric: true,
      },
      createAuthedContext(USER_1),
    );

    expect(result.name).toBe("Voiture mise a jour");
    expect(result.licensePlate).toBe("ZZ-999-ZZ");
    expect(result.electric).toBe(true);
  });

  test("should not update a car that does not belong to the user", async () => {
    await expect(
      call(
        appRouter.updateMyCar,
        {
          carId: CAR_2.id,
          name: "Forbidden update",
          licensePlate: "NO-000-NO",
          electric: false,
        },
        createAuthedContext(USER_1),
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  test("should delete an owned car without reservations", async () => {
    const extraCar = await prisma.car.create({
      data: {
        userId: USER_1.id,
        name: "Voiture a supprimer",
        licensePlate: "DEL-001-AA",
        electric: false,
      },
    });

    const result = await call(
      appRouter.deleteMyCar,
      { carId: extraCar.id },
      createAuthedContext(USER_1),
    );

    expect(result.deleted).toBe(true);

    const deletedCar = await prisma.car.findUnique({
      where: { id: extraCar.id },
    });
    expect(deletedCar).toBeNull();
  });

  test("should reject deleting a car linked to reservations", async () => {
    await prisma.reservation.create({
      data: {
        userId: USER_1.id,
        carId: CAR_1.id,
        parkingSpotId: SPOT.id,
        date: toReservationDate("2099-09-01"),
        status: "RESERVED",
      },
    });

    await expect(
      call(
        appRouter.deleteMyCar,
        { carId: CAR_1.id },
        createAuthedContext(USER_1),
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
