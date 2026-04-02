import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { getCurrentReservationDateString, toReservationDate } from "@api/helpers";
import prisma, { ReservationStatus } from "@hitachi2/db";
import { call } from "@orpc/server";
import { appRouter } from "../../src/routers/index";
import {
  cleanupUsers,
  createAuthedContext,
  createCar,
  createSpot,
  createTestUser,
  seedCars,
  seedSpots,
  seedUsers,
} from "../helpers";

const USER_1 = createTestUser({ id: "test-cibs-user-1", name: "CI Spot User 1" });
const USER_2 = createTestUser({ id: "test-cibs-user-2", name: "CI Spot User 2" });
const CAR_1 = createCar(USER_1.id, { id: "test-cibs-car-1" });
const SPOT = createSpot({ id: "test-cibs-spot-1", name: "TEST-CIBS-A01" });

const authedContext = createAuthedContext(USER_1);

function todayDate() {
  return toReservationDate(getCurrentReservationDateString());
}

beforeAll(async () => {
  await prisma.reservation.deleteMany({ where: { parkingSpotId: SPOT.id } });
  await prisma.parkingSpot.deleteMany({ where: { id: SPOT.id } });
  await prisma.car.deleteMany({ where: { id: CAR_1.id } });
  await prisma.user.deleteMany({ where: { id: { in: [USER_1.id, USER_2.id] } } });

  await seedUsers(USER_1, USER_2);
  await seedCars(CAR_1);
  await seedSpots(SPOT);
});

afterAll(async () => {
  await prisma.reservation.deleteMany({ where: { parkingSpotId: SPOT.id } });
  await prisma.parkingSpot.delete({ where: { id: SPOT.id } });
  await prisma.car.delete({ where: { id: CAR_1.id } });
  await cleanupUsers(USER_1, USER_2);
});

beforeEach(async () => {
  await prisma.checkIn.deleteMany({ where: { reservation: { parkingSpotId: SPOT.id } } });
  await prisma.reservation.deleteMany({ where: { parkingSpotId: SPOT.id } });
});

async function createTodayReservationTest(overrides?: { userId?: string; carId?: string; status?: ReservationStatus }) {
  return prisma.reservation.create({
    data: {
      userId: overrides?.userId ?? USER_1.id,
      carId: overrides?.carId ?? CAR_1.id,
      parkingSpotId: SPOT.id,
      date: todayDate(),
      status: overrides?.status ?? ReservationStatus.RESERVED,
    },
  });
}

describe("parking-reservation.checkInBySpot", () => {
  test("should check in, return checkedAt, and update DB state", async () => {
    await createTodayReservationTest();

    const result = await call(appRouter.checkInBySpot, { spotId: SPOT.id }, authedContext);

    expect(result.checkedAt).toBeInstanceOf(Date);

    const reservation = await prisma.reservation.findFirst({ where: { parkingSpotId: SPOT.id } });
    expect(reservation?.status).toBe(ReservationStatus.COMPLETED);

    const checkIn = await prisma.checkIn.findFirst({ where: { reservation: { parkingSpotId: SPOT.id } } });
    expect(checkIn).not.toBeNull();
  });

  test("should throw UNAUTHORIZED when not authenticated", async () => {
    expect(
      call(
        appRouter.checkInBySpot,
        { spotId: SPOT.id },
        { context: { session: null, jobQueue: { send: async () => null } } },
      ),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  test("should throw NOT_FOUND when spot does not exist", async () => {
    expect(call(appRouter.checkInBySpot, { spotId: "non-existent-spot" }, authedContext)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  test("should throw NOT_FOUND when user has no reservation for that spot today", async () => {
    expect(call(appRouter.checkInBySpot, { spotId: SPOT.id }, authedContext)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  test("should throw NOT_FOUND when reservation belongs to another user", async () => {
    await createTodayReservationTest({ userId: USER_2.id, carId: CAR_1.id });

    expect(call(appRouter.checkInBySpot, { spotId: SPOT.id }, authedContext)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  test("should throw CONFLICT when reservation is already checked in", async () => {
    await createTodayReservationTest({ status: ReservationStatus.COMPLETED });

    expect(call(appRouter.checkInBySpot, { spotId: SPOT.id }, authedContext)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  test("should throw CONFLICT on concurrent check-in (second call loses the race)", async () => {
    await createTodayReservationTest();

    await call(appRouter.checkInBySpot, { spotId: SPOT.id }, authedContext);

    expect(call(appRouter.checkInBySpot, { spotId: SPOT.id }, authedContext)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });
});
