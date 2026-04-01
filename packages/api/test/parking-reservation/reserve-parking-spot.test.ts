import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { toReservationDate } from "@api/helpers";
import prisma, { ReservationStatus, UserRole } from "@hitachi2/db";
import { call } from "@orpc/server";
import { appRouter } from "../../src/routers/index";
import { createContext } from "../helpers";

const SUCCESS_DATE = "2099-06-01";
const CONFLICT_DATE = "2099-06-02";
const RACE_DATE = "2099-06-03";

const TEST_USER = {
  id: "test-reserve-user",
  name: "Test User",
  email: "test-reserve@test.com",
  emailVerified: true as const,
  role: UserRole.EMPLOYEE,
};

const TEST_MANAGER = {
  id: "test-manager-user",
  name: "Test Manager",
  email: "test-manager@test.com",
  emailVerified: true,
  role: UserRole.MANAGER,
};

beforeAll(async () => {
  await prisma.user.deleteMany({
    where: { id: { in: [TEST_USER.id, TEST_MANAGER.id] } },
  });
  await prisma.user.createMany({ data: [TEST_USER, TEST_MANAGER] });
});

afterAll(async () => {
  await prisma.reservation.deleteMany({
    where: { userId: { in: [TEST_USER.id, TEST_MANAGER.id] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [TEST_USER.id, TEST_MANAGER.id] } },
  });
});

afterEach(async () => {
  await prisma.reservation.deleteMany({
    where: { userId: TEST_USER.id },
  });
});

const employeeCtx = createContext(TEST_USER);
const managerCtx = createContext(TEST_MANAGER);

describe("parking-reservation.reserveParkingSpot", () => {
  test("should reserve the first available spot", async () => {
    const result = await call(appRouter.reserveParkingSpot, { date: SUCCESS_DATE }, employeeCtx);

    expect(result.reservationId).toBeDefined();
    expect(result.parkingSpot.name).toBeDefined();
    expect(result.date).toBe(SUCCESS_DATE);
  });

  test("should throw CONFLICT when no spot is available", async () => {
    const spots = await prisma.parkingSpot.findMany({
      where: { available: true },
      select: { id: true },
    });
    const actor = await prisma.car.findFirstOrThrow({ orderBy: { id: "asc" } });

    await prisma.reservation.createMany({
      data: spots.map((spot) => ({
        userId: actor.userId,
        carId: actor.id,
        parkingSpotId: spot.id,
        date: toReservationDate(CONFLICT_DATE),
        status: ReservationStatus.RESERVED,
      })),
    });

    await expect(call(appRouter.reserveParkingSpot, { date: CONFLICT_DATE }, employeeCtx)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  test("should throw BAD_REQUEST on invalid date format", async () => {
    expect(call(appRouter.reserveParkingSpot, { date: "01-06-2099" }, employeeCtx)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  test("should throw FORBIDDEN when employee exceeds 5 reservations", async () => {
    const spots = await prisma.parkingSpot.findMany({
      where: { available: true },
      take: 6,
      select: { id: true },
    });
    const actor = await prisma.car.findFirstOrThrow({ orderBy: { id: "asc" } });

    await prisma.reservation.createMany({
      data: spots.map((spot) => ({
        userId: TEST_USER.id,
        carId: actor.id,
        parkingSpotId: spot.id,
        date: toReservationDate("2099-07-01"),
        status: ReservationStatus.RESERVED,
      })),
    });

    expect(call(appRouter.reserveParkingSpot, { date: "2099-07-07" }, employeeCtx)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  test("should handle concurrent reservations — only one wins", async () => {
    const spots = await prisma.parkingSpot.findMany({ where: { available: true }, select: { id: true } });
    const actor = await prisma.car.findFirstOrThrow({ orderBy: { id: "asc" } });

    // Leave exactly 1 spot open
    await prisma.reservation.createMany({
      data: spots.slice(0, -1).map((spot) => ({
        userId: actor.userId,
        carId: actor.id,
        parkingSpotId: spot.id,
        date: toReservationDate(RACE_DATE),
        status: ReservationStatus.RESERVED,
      })),
    });

    const results = await Promise.allSettled([
      call(appRouter.reserveParkingSpot, { date: RACE_DATE }, employeeCtx),
      call(appRouter.reserveParkingSpot, { date: RACE_DATE }, managerCtx),
    ]);

    const succeeded = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected");

    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect((failed[0] as PromiseRejectedResult).reason).toMatchObject({ code: "CONFLICT" });

    // Cleanup pre-filled reservations (actor.userId not covered by afterEach)
    await prisma.reservation.deleteMany({
      where: { userId: actor.userId, date: toReservationDate(RACE_DATE) },
    });
  });

  test("should allow manager to have up to 30 reservations", async () => {
    const result = await call(appRouter.reserveParkingSpot, { date: SUCCESS_DATE }, managerCtx);

    expect(result.reservationId).toBeDefined();
  });
});
