import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { toReservationDate } from "@api/helpers";
import prisma from "@hitachi2/db";
import { call } from "@orpc/server";

import { appRouter } from "../../src/routers/index";

const SUCCESS_DATE = "2099-06-01";
const CONFLICT_DATE = "2099-06-02";

const USER_WITH_CAR = {
  id: "test-reserve-user-1",
  name: "Reserve User",
  email: "test-reserve-user-1@test.com",
  emailVerified: true as const,
};

const USER_WITHOUT_CAR = {
  id: "test-reserve-user-2",
  name: "Reserve No Car",
  email: "test-reserve-user-2@test.com",
  emailVerified: true as const,
};

const CAR = {
  id: "test-reserve-car-1",
  userId: USER_WITH_CAR.id,
  name: "Reserve Car",
  licensePlate: "RSV-001-AA",
  electric: false,
};

function createAuthedContext(user: typeof USER_WITH_CAR) {
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
      userId: {
        in: [USER_WITH_CAR.id, USER_WITHOUT_CAR.id],
      },
    },
  });
  await prisma.car.deleteMany({
    where: {
      id: CAR.id,
    },
  });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [USER_WITH_CAR.id, USER_WITHOUT_CAR.id],
      },
    },
  });

  await prisma.user.createMany({
    data: [USER_WITH_CAR, USER_WITHOUT_CAR],
  });
  await prisma.car.create({
    data: CAR,
  });
});

afterEach(async () => {
  await prisma.reservation.deleteMany({
    where: {
      userId: {
        in: [USER_WITH_CAR.id, USER_WITHOUT_CAR.id],
      },
    },
  });
});

afterAll(async () => {
  await prisma.reservation.deleteMany({
    where: {
      userId: {
        in: [USER_WITH_CAR.id, USER_WITHOUT_CAR.id],
      },
    },
  });
  await prisma.car.deleteMany({
    where: {
      id: CAR.id,
    },
  });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [USER_WITH_CAR.id, USER_WITHOUT_CAR.id],
      },
    },
  });
});

describe("parking-reservation.reserveParkingSpot", () => {
  test("should reserve the first available spot for the authenticated user car", async () => {
    const result = await call(
      appRouter.reserveParkingSpot,
      { date: SUCCESS_DATE },
      createAuthedContext(USER_WITH_CAR),
    );

    expect(result.reservationId).toBeDefined();
    expect(result.parkingSpot.name).toBeDefined();
    expect(result.date).toBe(SUCCESS_DATE);

    const reservation = await prisma.reservation.findUniqueOrThrow({
      where: { id: result.reservationId },
    });
    expect(reservation.userId).toBe(USER_WITH_CAR.id);
    expect(reservation.carId).toBe(CAR.id);
  });

  test("should throw UNAUTHORIZED when not authenticated", async () => {
    await expect(
      call(
        appRouter.reserveParkingSpot,
        { date: SUCCESS_DATE },
        unauthenticatedContext,
      ),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  test("should throw PRECONDITION_FAILED when the user has no car", async () => {
    await expect(
      call(
        appRouter.reserveParkingSpot,
        { date: SUCCESS_DATE },
        createAuthedContext(USER_WITHOUT_CAR),
      ),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });

  test("should throw CONFLICT when no spot is available", async () => {
    const spots = await prisma.parkingSpot.findMany({
      where: { available: true },
      select: { id: true },
    });

    await prisma.reservation.createMany({
      data: spots.map((spot) => ({
        userId: USER_WITH_CAR.id,
        carId: CAR.id,
        parkingSpotId: spot.id,
        date: toReservationDate(CONFLICT_DATE),
        status: "RESERVED" as const,
      })),
    });

    await expect(
      call(
        appRouter.reserveParkingSpot,
        { date: CONFLICT_DATE },
        createAuthedContext(USER_WITH_CAR),
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  test("should throw BAD_REQUEST on invalid date format", async () => {
    await expect(
      call(
        appRouter.reserveParkingSpot,
        { date: "01-06-2099" },
        createAuthedContext(USER_WITH_CAR),
      ),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
