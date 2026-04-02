import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import prisma, { ReservationStatus } from "@hitachi2/db";
import { call } from "@orpc/server";
import { getCurrentReservationDateString } from "../../src/helpers";
import { appRouter } from "../../src/routers/index";
import { createContext } from "../helpers";

const USER = {
  id: "test-soc-user-1",
  name: "SOC User 1",
  email: "test-soc-1@test.com",
  emailVerified: true,
};
const CAR = { id: "test-soc-car-1", userId: USER.id, electric: false };

// 3 regular spots, 2 electric spots
const SPOT_REG_1 = { id: "test-soc-spot-r1", name: "TEST-SOC-R01", charger: false, available: true };
const SPOT_REG_2 = { id: "test-soc-spot-r2", name: "TEST-SOC-R02", charger: false, available: true };
const SPOT_REG_3 = { id: "test-soc-spot-r3", name: "TEST-SOC-R03", charger: false, available: true };
const SPOT_ELC_1 = { id: "test-soc-spot-e1", name: "TEST-SOC-E01", charger: true, available: true };
const SPOT_ELC_2 = { id: "test-soc-spot-e2", name: "TEST-SOC-E02", charger: true, available: true };

const ALL_SPOTS = [SPOT_REG_1, SPOT_REG_2, SPOT_REG_3, SPOT_ELC_1, SPOT_ELC_2];
const ALL_SPOT_IDS = ALL_SPOTS.map((s) => s.id);

const authedContext = createContext(USER);
const TODAY = getCurrentReservationDateString();

let disabledSpotIds: string[] = [];

beforeAll(async () => {
  await prisma.reservation.deleteMany({ where: { parkingSpotId: { in: ALL_SPOT_IDS } } });
  await prisma.parkingSpot.deleteMany({ where: { id: { in: ALL_SPOT_IDS } } });
  await prisma.car.deleteMany({ where: { id: CAR.id } });
  await prisma.user.deleteMany({ where: { id: USER.id } });

  // Disable all pre-existing available spots so totalSlots only reflects our test data
  const existing = await prisma.parkingSpot.findMany({
    where: { available: true },
    select: { id: true },
  });
  disabledSpotIds = existing.map((s) => s.id);
  await prisma.parkingSpot.updateMany({ where: { id: { in: disabledSpotIds } }, data: { available: false } });

  await prisma.user.create({ data: USER });
  await prisma.car.create({ data: CAR });
  await prisma.parkingSpot.createMany({ data: ALL_SPOTS });
});

afterAll(async () => {
  await prisma.reservation.deleteMany({ where: { parkingSpotId: { in: ALL_SPOT_IDS } } });
  await prisma.parkingSpot.deleteMany({ where: { id: { in: ALL_SPOT_IDS } } });
  await prisma.car.delete({ where: { id: CAR.id } });
  await prisma.user.delete({ where: { id: USER.id } });

  // Restore the spots we disabled
  await prisma.parkingSpot.updateMany({ where: { id: { in: disabledSpotIds } }, data: { available: true } });
});

beforeEach(async () => {
  await prisma.reservation.deleteMany({ where: { parkingSpotId: { in: ALL_SPOT_IDS } } });
});

async function createReservation(spotId: string, status: ReservationStatus, dateString = TODAY) {
  return prisma.reservation.create({
    data: {
      userId: USER.id,
      carId: CAR.id,
      parkingSpotId: spotId,
      date: new Date(`${dateString}T00:00:00.000Z`),
      status,
    },
  });
}

describe("parking-reservation.getSlotOccupancy", () => {
  test("should return 0% when no reservations exist for the day", async () => {
    const result = await call(appRouter.getSlotOccupancy, { date: TODAY }, authedContext);

    expect(result.occupiedSlots).toBe(0);
    expect(result.occupancyRate).toBe(0);
    expect(result.occupiedElectricSlots).toBe(0);
    expect(result.electricOccupancyRate).toBe(0);
    expect(result.totalSlots).toBe(5);
    expect(result.totalElectricSlots).toBe(2);
  });

  test("should count RESERVED reservations as occupied", async () => {
    await createReservation(SPOT_REG_1.id, ReservationStatus.RESERVED);
    await createReservation(SPOT_ELC_1.id, ReservationStatus.RESERVED);

    const result = await call(appRouter.getSlotOccupancy, { date: TODAY }, authedContext);

    expect(result.occupiedSlots).toBe(2);
    expect(result.occupiedElectricSlots).toBe(1);
  });

  test("should count COMPLETED reservations as occupied", async () => {
    await createReservation(SPOT_REG_1.id, ReservationStatus.COMPLETED);
    await createReservation(SPOT_ELC_1.id, ReservationStatus.COMPLETED);

    const result = await call(appRouter.getSlotOccupancy, { date: TODAY }, authedContext);

    expect(result.occupiedSlots).toBe(2);
    expect(result.occupiedElectricSlots).toBe(1);
  });

  test("should NOT count NO_SHOW or CANCELLED reservations as occupied", async () => {
    await createReservation(SPOT_REG_1.id, ReservationStatus.NO_SHOW);
    await createReservation(SPOT_ELC_1.id, ReservationStatus.CANCELLED);

    const result = await call(appRouter.getSlotOccupancy, { date: TODAY }, authedContext);

    expect(result.occupiedSlots).toBe(0);
    expect(result.occupiedElectricSlots).toBe(0);
  });

  test("should calculate correct occupancy rates", async () => {
    // 2 of 3 regular, 1 of 2 electric
    await createReservation(SPOT_REG_1.id, ReservationStatus.RESERVED);
    await createReservation(SPOT_REG_2.id, ReservationStatus.COMPLETED);
    await createReservation(SPOT_ELC_1.id, ReservationStatus.RESERVED);

    const result = await call(appRouter.getSlotOccupancy, { date: TODAY }, authedContext);

    // 3 out of 5 total = 60%
    expect(result.occupiedSlots).toBe(3);
    expect(result.occupancyRate).toBeCloseTo(60, 1);

    // 1 out of 2 electric = 50%
    expect(result.occupiedElectricSlots).toBe(1);
    expect(result.electricOccupancyRate).toBeCloseTo(50, 1);
  });

  test("should return 100% when all slots are occupied", async () => {
    for (const spot of ALL_SPOTS) {
      await createReservation(spot.id, ReservationStatus.RESERVED);
    }

    const result = await call(appRouter.getSlotOccupancy, { date: TODAY }, authedContext);

    expect(result.occupancyRate).toBe(100);
    expect(result.electricOccupancyRate).toBe(100);
  });

  test("should default to today when no date provided", async () => {
    await createReservation(SPOT_REG_1.id, ReservationStatus.RESERVED);

    const resultWithDate = await call(appRouter.getSlotOccupancy, { date: TODAY }, authedContext);
    const resultDefault = await call(appRouter.getSlotOccupancy, undefined, authedContext);

    expect(resultDefault.occupiedSlots).toBe(resultWithDate.occupiedSlots);
  });

  test("should isolate stats to the requested date", async () => {
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayString = yesterday.toISOString().slice(0, 10);

    await createReservation(SPOT_REG_1.id, ReservationStatus.RESERVED, yesterdayString);

    const result = await call(appRouter.getSlotOccupancy, { date: TODAY }, authedContext);

    expect(result.occupiedSlots).toBe(0);
  });

  test("should throw UNAUTHORIZED when not authenticated", async () => {
    expect(
      call(appRouter.getSlotOccupancy, undefined, {
        context: { session: null, jobQueue: { send: async () => null } },
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
