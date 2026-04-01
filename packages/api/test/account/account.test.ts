import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { toReservationDate } from "@api/helpers";
import prisma, { ReservationStatus, UserRole } from "@hitachi2/db";
import { call } from "@orpc/server";
import { appRouter } from "../../src/routers/index";
import { createContext } from "../helpers";

const TEST_USER = {
  id: "test-account-user",
  name: "Account Owner",
  email: "test-account@test.com",
  emailVerified: true as const,
  role: UserRole.EMPLOYEE,
};

const OTHER_USER = {
  id: "test-account-other-user",
  name: "Other User",
  email: "test-account-other@test.com",
  emailVerified: true as const,
  role: UserRole.EMPLOYEE,
};

const EXISTING_CAR = {
  id: "test-account-car",
  userId: TEST_USER.id,
  name: "Voiture principale",
  licensePlate: "AC-001-AA",
  electric: false,
};

const OTHER_CAR = {
  id: "test-account-other-car",
  userId: OTHER_USER.id,
  name: "Voiture secondaire",
  licensePlate: "AC-002-AA",
  electric: true,
};

const accountCtx = createContext(TEST_USER);

beforeAll(async () => {
  await prisma.reservation.deleteMany({
    where: { userId: { in: [TEST_USER.id, OTHER_USER.id] } },
  });
  await prisma.car.deleteMany({
    where: { userId: { in: [TEST_USER.id, OTHER_USER.id] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [TEST_USER.id, OTHER_USER.id] } },
  });

  await prisma.user.createMany({
    data: [TEST_USER, OTHER_USER],
  });
  await prisma.car.createMany({
    data: [EXISTING_CAR, OTHER_CAR],
  });
});

afterEach(async () => {
  await prisma.reservation.deleteMany({
    where: { userId: { in: [TEST_USER.id, OTHER_USER.id] } },
  });
  await prisma.car.deleteMany({
    where: {
      userId: TEST_USER.id,
      id: { not: EXISTING_CAR.id },
    },
  });
  await prisma.car.update({
    where: { id: EXISTING_CAR.id },
    data: {
      name: "Voiture principale",
      licensePlate: "AC-001-AA",
      electric: false,
    },
  });
});

afterAll(async () => {
  await prisma.reservation.deleteMany({
    where: { userId: { in: [TEST_USER.id, OTHER_USER.id] } },
  });
  await prisma.car.deleteMany({
    where: { userId: { in: [TEST_USER.id, OTHER_USER.id] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [TEST_USER.id, OTHER_USER.id] } },
  });
});

describe("account router", () => {
  test("should return my account with linked cars", async () => {
    const result = await call(appRouter.getMyAccount, undefined, accountCtx);

    expect(result.id).toBe(TEST_USER.id);
    expect(result.email).toBe(TEST_USER.email);
    expect(result.reservationCount).toBe(0);
    expect(result.reservationLimit).toBe(5);
    expect(result.remainingReservationCount).toBe(5);
    expect(result.cars).toHaveLength(1);
    expect(result.cars[0]?.licensePlate).toBe("AC-001-AA");
  });

  test("should create a new car for the authenticated user", async () => {
    const result = await call(
      appRouter.createMyCar,
      {
        name: "Voiture ville",
        licensePlate: "ac-123-bb",
        electric: true,
      },
      accountCtx,
    );

    expect(result.licensePlate).toBe("AC-123-BB");
    expect(result.electric).toBe(true);

    const created = await prisma.car.findUnique({ where: { id: result.id } });
    expect(created?.userId).toBe(TEST_USER.id);
  });

  test("should update an owned car", async () => {
    const result = await call(
      appRouter.updateMyCar,
      {
        carId: EXISTING_CAR.id,
        name: "Voiture modifiee",
        licensePlate: "zz-999-zz",
        electric: true,
      },
      accountCtx,
    );

    expect(result.name).toBe("Voiture modifiee");
    expect(result.licensePlate).toBe("ZZ-999-ZZ");
    expect(result.electric).toBe(true);
  });

  test("should reject update on a car owned by another user", async () => {
    expect(
      call(
        appRouter.updateMyCar,
        {
          carId: OTHER_CAR.id,
          name: "Intrusion",
          licensePlate: "AC-333-CC",
          electric: false,
        },
        accountCtx,
      ),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  test("should reject duplicate license plates", async () => {
    expect(
      call(
        appRouter.createMyCar,
        {
          name: "Doublon",
          licensePlate: OTHER_CAR.licensePlate,
          electric: false,
        },
        accountCtx,
      ),
    ).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  test("should delete a car without reservations", async () => {
    const created = await prisma.car.create({
      data: {
        userId: TEST_USER.id,
        name: "Voiture a supprimer",
        licensePlate: "AC-004-DD",
        electric: false,
      },
    });

    const result = await call(appRouter.deleteMyCar, { carId: created.id }, accountCtx);

    expect(result).toEqual({
      carId: created.id,
      deleted: true,
    });

    const deleted = await prisma.car.findUnique({ where: { id: created.id } });
    expect(deleted).toBeNull();
  });

  test("should reject deletion when the car is linked to reservations", async () => {
    const parkingSpot = await prisma.parkingSpot.findFirstOrThrow({
      where: { available: true },
      select: { id: true },
    });

    await prisma.reservation.create({
      data: {
        userId: TEST_USER.id,
        carId: EXISTING_CAR.id,
        parkingSpotId: parkingSpot.id,
        date: toReservationDate("2099-09-01"),
        status: ReservationStatus.RESERVED,
      },
    });

    expect(call(appRouter.deleteMyCar, { carId: EXISTING_CAR.id }, accountCtx)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });
});
