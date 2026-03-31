import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import prisma from "@hitachi2/db";
import { call } from "@orpc/server";
import { appRouter } from "../../src/routers/index";

const USER_1 = {
  id: "test-ci-user-1",
  name: "CI User 1",
  email: "test-ci-1@test.com",
  emailVerified: true as const,
};
const USER_2 = {
  id: "test-ci-user-2",
  name: "CI User 2",
  email: "test-ci-2@test.com",
  emailVerified: true as const,
};
const CAR_1 = {
  id: "test-ci-car-1",
  userId: USER_1.id,
  name: "CI Car 1",
  licensePlate: "CI-001-AA",
  electric: false,
};
const CAR_2 = {
  id: "test-ci-car-2",
  userId: USER_2.id,
  name: "CI Car 2",
  licensePlate: "CI-002-AA",
  electric: false,
};
const SPOT = {
  id: "test-ci-spot-1",
  name: "TEST-CI-A01",
  charger: false,
  available: true,
};

const authedContext = {
  context: {
    session: {
      session: {
        id: "test-session-id",
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: USER_1.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        token: "test-token",
        ipAddress: "127.0.0.1",
        userAgent: "bun-test",
      },
      user: {
        id: USER_1.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        email: USER_1.email,
        emailVerified: USER_1.emailVerified,
        name: USER_1.name,
        image: null,
      },
    },
    jobQueue: { send: async () => null },
  },
};

beforeAll(async () => {
  await prisma.reservation.deleteMany({ where: { parkingSpotId: SPOT.id } });
  await prisma.parkingSpot.deleteMany({ where: { id: SPOT.id } });
  await prisma.car.deleteMany({ where: { id: { in: [CAR_1.id, CAR_2.id] } } });
  await prisma.user.deleteMany({
    where: { id: { in: [USER_1.id, USER_2.id] } },
  });

  await prisma.user.createMany({ data: [USER_1, USER_2] });
  await prisma.car.createMany({ data: [CAR_1, CAR_2] });
  await prisma.parkingSpot.create({ data: SPOT });
});

afterAll(async () => {
  await prisma.reservation.deleteMany({ where: { parkingSpotId: SPOT.id } });
  await prisma.parkingSpot.delete({ where: { id: SPOT.id } });
  await prisma.car.deleteMany({ where: { id: { in: [CAR_1.id, CAR_2.id] } } });
  await prisma.user.deleteMany({
    where: { id: { in: [USER_1.id, USER_2.id] } },
  });
});

beforeEach(async () => {
  await prisma.checkIn.deleteMany({
    where: { reservation: { parkingSpotId: SPOT.id } },
  });
  await prisma.reservation.deleteMany({ where: { parkingSpotId: SPOT.id } });
});

async function createReservation(overrides?: {
  userId?: string;
  carId?: string;
  status?: "RESERVED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
}) {
  return prisma.reservation.create({
    data: {
      userId: overrides?.userId ?? USER_1.id,
      carId: overrides?.carId ?? CAR_1.id,
      parkingSpotId: SPOT.id,
      date: new Date("2099-07-01T00:00:00.000Z"),
      status: overrides?.status ?? "RESERVED",
    },
  });
}

describe("parking-reservation.checkIn", () => {
  test("should check in, return checkedAt, and update DB state", async () => {
    const reservation = await createReservation();

    const result = await call(
      appRouter.checkIn,
      { reservationId: reservation.id },
      authedContext,
    );

    expect(result.checkedAt).toBeInstanceOf(Date);

    const updated = await prisma.reservation.findUnique({
      where: { id: reservation.id },
    });
    expect(updated?.status).toBe("COMPLETED");

    const checkIn = await prisma.checkIn.findUnique({
      where: { reservationId: reservation.id },
    });
    expect(checkIn).not.toBeNull();
  });

  test("should throw UNAUTHORIZED when not authenticated", async () => {
    expect(
      call(
        appRouter.checkIn,
        { reservationId: "any-id" },
        {
          context: { session: null, jobQueue: { send: async () => null } },
        },
      ),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  test("should throw NOT_FOUND when reservation does not exist", async () => {
    expect(
      call(
        appRouter.checkIn,
        { reservationId: "non-existent-id" },
        authedContext,
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  test("should throw FORBIDDEN when user does not own the reservation", async () => {
    const reservation = await createReservation({
      userId: USER_2.id,
      carId: CAR_2.id,
    });

    expect(
      call(appRouter.checkIn, { reservationId: reservation.id }, authedContext),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  test("should throw CONFLICT when reservation is not in RESERVED status", async () => {
    const reservation = await createReservation({ status: "COMPLETED" });

    expect(
      call(appRouter.checkIn, { reservationId: reservation.id }, authedContext),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
