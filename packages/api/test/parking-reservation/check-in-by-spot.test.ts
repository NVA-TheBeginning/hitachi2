import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import prisma, { ReservationStatus } from "@hitachi2/db";
import { call } from "@orpc/server";
import { getCurrentReservationDateString, toReservationDate } from "../../src/helpers";
import { appRouter } from "../../src/routers/index";
import { createContext } from "../helpers";

const USER_1 = {
  id: "test-cibs-user-1",
  name: "CI Spot User 1",
  email: "test-cibs-1@test.com",
  emailVerified: true,
};
const USER_2 = {
  id: "test-cibs-user-2",
  name: "CI Spot User 2",
  email: "test-cibs-2@test.com",
  emailVerified: true,
};
const CAR_1 = { id: "test-cibs-car-1", userId: USER_1.id, electric: false };
const SPOT = {
  id: "test-cibs-spot-1",
  name: "TEST-CIBS-A01",
  charger: false,
  available: true,
};

const authedContext = createContext(USER_1);

function todayDate() {
  return toReservationDate(getCurrentReservationDateString());
}

beforeAll(async () => {
  await prisma.reservation.deleteMany({ where: { parkingSpotId: SPOT.id } });
  await prisma.parkingSpot.deleteMany({ where: { id: SPOT.id } });
  await prisma.car.deleteMany({ where: { id: CAR_1.id } });
  await prisma.user.deleteMany({ where: { id: { in: [USER_1.id, USER_2.id] } } });

  await prisma.user.createMany({ data: [USER_1, USER_2] });
  await prisma.car.create({ data: CAR_1 });
  await prisma.parkingSpot.create({ data: SPOT });
});

afterAll(async () => {
  await prisma.reservation.deleteMany({ where: { parkingSpotId: SPOT.id } });
  await prisma.parkingSpot.delete({ where: { id: SPOT.id } });
  await prisma.car.delete({ where: { id: CAR_1.id } });
  await prisma.user.deleteMany({ where: { id: { in: [USER_1.id, USER_2.id] } } });
});

beforeEach(async () => {
  await prisma.checkIn.deleteMany({ where: { reservation: { parkingSpotId: SPOT.id } } });
  await prisma.reservation.deleteMany({ where: { parkingSpotId: SPOT.id } });
});

async function createTodayReservation(overrides?: { userId?: string; carId?: string; status?: ReservationStatus }) {
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
    await createTodayReservation();

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
    await createTodayReservation({ userId: USER_2.id, carId: CAR_1.id });

    expect(call(appRouter.checkInBySpot, { spotId: SPOT.id }, authedContext)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  test("should throw CONFLICT when reservation is already checked in", async () => {
    await createTodayReservation({ status: ReservationStatus.COMPLETED });

    expect(call(appRouter.checkInBySpot, { spotId: SPOT.id }, authedContext)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });
});
