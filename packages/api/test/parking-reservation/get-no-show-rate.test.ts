import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import prisma, { ReservationStatus } from "@hitachi2/db";
import { call } from "@orpc/server";
import { appRouter } from "../../src/routers/index";
import { createContext } from "../helpers";

const USER_1 = {
  id: "test-nsr-user-1",
  name: "NSR User 1",
  email: "test-nsr-1@test.com",
  emailVerified: true,
};
const USER_2 = {
  id: "test-nsr-user-2",
  name: "NSR User 2",
  email: "test-nsr-2@test.com",
  emailVerified: true,
};
const CAR_1 = { id: "test-nsr-car-1", userId: USER_1.id, electric: false };
const CAR_2 = { id: "test-nsr-car-2", userId: USER_2.id, electric: false };
const SPOT_1 = { id: "test-nsr-spot-1", name: "TEST-NSR-A01", charger: false, available: true };
const SPOT_2 = { id: "test-nsr-spot-2", name: "TEST-NSR-A02", charger: false, available: true };
const SPOT_3 = { id: "test-nsr-spot-3", name: "TEST-NSR-A03", charger: false, available: true };

const authedContext1 = createContext(USER_1);
const authedContext2 = createContext(USER_2);

const SPOT_IDS = [SPOT_1.id, SPOT_2.id, SPOT_3.id];

beforeAll(async () => {
  await prisma.reservation.deleteMany({ where: { parkingSpotId: { in: SPOT_IDS } } });
  await prisma.parkingSpot.deleteMany({ where: { id: { in: SPOT_IDS } } });
  await prisma.car.deleteMany({ where: { id: { in: [CAR_1.id, CAR_2.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [USER_1.id, USER_2.id] } } });

  await prisma.user.createMany({ data: [USER_1, USER_2] });
  await prisma.car.createMany({ data: [CAR_1, CAR_2] });
  await prisma.parkingSpot.createMany({ data: [SPOT_1, SPOT_2, SPOT_3] });
});

afterAll(async () => {
  await prisma.reservation.deleteMany({ where: { parkingSpotId: { in: SPOT_IDS } } });
  await prisma.parkingSpot.deleteMany({ where: { id: { in: SPOT_IDS } } });
  await prisma.car.deleteMany({ where: { id: { in: [CAR_1.id, CAR_2.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [USER_1.id, USER_2.id] } } });
});

beforeEach(async () => {
  await prisma.reservation.deleteMany({ where: { parkingSpotId: { in: SPOT_IDS } } });
});

function makeDate(offset: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function makeDateString(offset: number) {
  const d = makeDate(offset);
  return d.toISOString().slice(0, 10);
}

async function createReservation(
  userId: string,
  carId: string,
  spotId: string,
  status: ReservationStatus,
  dateOffset = -1,
) {
  return prisma.reservation.create({
    data: { userId, carId, parkingSpotId: spotId, date: makeDate(dateOffset), status },
  });
}

describe("parking-reservation.getNoShowRate", () => {
  test("should return zero rate when user has no reservations", async () => {
    const result = await call(appRouter.getNoShowRate, undefined, authedContext1);

    expect(result).toEqual({ totalReservations: 0, noShowCount: 0, completedCount: 0, rate: 0 });
  });

  test("should return 0% rate when all reservations are completed", async () => {
    await createReservation(USER_1.id, CAR_1.id, SPOT_1.id, ReservationStatus.COMPLETED, -3);
    await createReservation(USER_1.id, CAR_1.id, SPOT_2.id, ReservationStatus.COMPLETED, -2);

    const result = await call(appRouter.getNoShowRate, undefined, authedContext1);

    expect(result.totalReservations).toBe(2);
    expect(result.noShowCount).toBe(0);
    expect(result.completedCount).toBe(2);
    expect(result.rate).toBe(0);
  });

  test("should return 100% rate when all reservations are no-shows", async () => {
    await createReservation(USER_1.id, CAR_1.id, SPOT_1.id, ReservationStatus.NO_SHOW, -3);
    await createReservation(USER_1.id, CAR_1.id, SPOT_2.id, ReservationStatus.NO_SHOW, -2);

    const result = await call(appRouter.getNoShowRate, undefined, authedContext1);

    expect(result.totalReservations).toBe(2);
    expect(result.noShowCount).toBe(2);
    expect(result.completedCount).toBe(0);
    expect(result.rate).toBe(100);
  });

  test("should return correct rate with mixed statuses", async () => {
    await createReservation(USER_1.id, CAR_1.id, SPOT_1.id, ReservationStatus.NO_SHOW, -4);
    await createReservation(USER_1.id, CAR_1.id, SPOT_2.id, ReservationStatus.COMPLETED, -3);
    await createReservation(USER_1.id, CAR_1.id, SPOT_3.id, ReservationStatus.COMPLETED, -2);

    const result = await call(appRouter.getNoShowRate, undefined, authedContext1);

    expect(result.totalReservations).toBe(3);
    expect(result.noShowCount).toBe(1);
    expect(result.completedCount).toBe(2);
    expect(result.rate).toBeCloseTo(33.33, 1);
  });

  test("should exclude RESERVED and CANCELLED reservations from the rate", async () => {
    await createReservation(USER_1.id, CAR_1.id, SPOT_1.id, ReservationStatus.RESERVED, 1);
    await createReservation(USER_1.id, CAR_1.id, SPOT_2.id, ReservationStatus.CANCELLED, -2);
    await createReservation(USER_1.id, CAR_1.id, SPOT_3.id, ReservationStatus.NO_SHOW, -3);

    const result = await call(appRouter.getNoShowRate, undefined, authedContext1);

    expect(result.totalReservations).toBe(1);
    expect(result.noShowCount).toBe(1);
    expect(result.rate).toBe(100);
  });

  test("should only count current user's reservations", async () => {
    await createReservation(USER_1.id, CAR_1.id, SPOT_1.id, ReservationStatus.NO_SHOW, -2);
    await createReservation(USER_2.id, CAR_2.id, SPOT_2.id, ReservationStatus.COMPLETED, -2);
    await createReservation(USER_2.id, CAR_2.id, SPOT_3.id, ReservationStatus.COMPLETED, -3);

    const result1 = await call(appRouter.getNoShowRate, undefined, authedContext1);
    const result2 = await call(appRouter.getNoShowRate, undefined, authedContext2);

    expect(result1.totalReservations).toBe(1);
    expect(result1.noShowCount).toBe(1);

    expect(result2.totalReservations).toBe(2);
    expect(result2.noShowCount).toBe(0);
  });

  test("should filter by startDate", async () => {
    await createReservation(USER_1.id, CAR_1.id, SPOT_1.id, ReservationStatus.NO_SHOW, -10);
    await createReservation(USER_1.id, CAR_1.id, SPOT_2.id, ReservationStatus.COMPLETED, -2);

    const startDate = makeDateString(-5);
    const result = await call(appRouter.getNoShowRate, { startDate }, authedContext1);

    expect(result.totalReservations).toBe(1);
    expect(result.completedCount).toBe(1);
    expect(result.noShowCount).toBe(0);
  });

  test("should filter by endDate", async () => {
    await createReservation(USER_1.id, CAR_1.id, SPOT_1.id, ReservationStatus.NO_SHOW, -10);
    await createReservation(USER_1.id, CAR_1.id, SPOT_2.id, ReservationStatus.COMPLETED, -2);

    const endDate = makeDateString(-5);
    const result = await call(appRouter.getNoShowRate, { endDate }, authedContext1);

    expect(result.totalReservations).toBe(1);
    expect(result.noShowCount).toBe(1);
    expect(result.completedCount).toBe(0);
  });

  test("should filter by startDate and endDate range", async () => {
    await createReservation(USER_1.id, CAR_1.id, SPOT_1.id, ReservationStatus.NO_SHOW, -10);
    await createReservation(USER_1.id, CAR_1.id, SPOT_2.id, ReservationStatus.NO_SHOW, -5);
    await createReservation(USER_1.id, CAR_1.id, SPOT_3.id, ReservationStatus.COMPLETED, -2);

    const startDate = makeDateString(-7);
    const endDate = makeDateString(-3);
    const result = await call(appRouter.getNoShowRate, { startDate, endDate }, authedContext1);

    expect(result.totalReservations).toBe(1);
    expect(result.noShowCount).toBe(1);
  });

  test("should throw UNAUTHORIZED when not authenticated", async () => {
    expect(
      call(appRouter.getNoShowRate, undefined, { context: { session: null, jobQueue: { send: async () => null } } }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
