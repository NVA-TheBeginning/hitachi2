import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import { getCurrentReservationDateString } from "@api/helpers";
import prisma from "@hitachi2/db";
import { call } from "@orpc/server";
import { appRouter } from "../../src/routers/index";

const USER = {
  id: "test-list-user-1",
  name: "List User",
  email: "test-list-1@test.com",
  emailVerified: true as const,
};

const CAR = {
  id: "test-list-car-1",
  userId: USER.id,
  name: "List Car",
  licensePlate: "LIST-001-AA",
  electric: false,
};

const FREE_SPOT = {
  id: "test-list-spot-free",
  name: "TEST-LIST-A01",
  charger: false,
  available: true,
};

const RESERVED_SPOT = {
  id: "test-list-spot-reserved",
  name: "TEST-LIST-A02",
  charger: false,
  available: true,
};

const context = {
  context: {
    session: null,
    jobQueue: { send: async () => null },
  },
};

beforeAll(async () => {
  await prisma.reservation.deleteMany({
    where: {
      parkingSpotId: {
        in: [FREE_SPOT.id, RESERVED_SPOT.id],
      },
    },
  });
  await prisma.parkingSpot.deleteMany({
    where: {
      id: {
        in: [FREE_SPOT.id, RESERVED_SPOT.id],
      },
    },
  });
  await prisma.car.deleteMany({ where: { id: CAR.id } });
  await prisma.user.deleteMany({ where: { id: USER.id } });

  await prisma.user.create({ data: USER });
  await prisma.car.create({ data: CAR });
  await prisma.parkingSpot.createMany({
    data: [FREE_SPOT, RESERVED_SPOT],
  });
});

afterAll(async () => {
  await prisma.reservation.deleteMany({
    where: {
      parkingSpotId: {
        in: [FREE_SPOT.id, RESERVED_SPOT.id],
      },
    },
  });
  await prisma.parkingSpot.deleteMany({
    where: {
      id: {
        in: [FREE_SPOT.id, RESERVED_SPOT.id],
      },
    },
  });
  await prisma.car.deleteMany({ where: { id: CAR.id } });
  await prisma.user.deleteMany({ where: { id: USER.id } });
});

beforeEach(async () => {
  await prisma.reservation.deleteMany({
    where: {
      parkingSpotId: {
        in: [FREE_SPOT.id, RESERVED_SPOT.id],
      },
    },
  });
});

async function createReservation(parkingSpotId: string, date: string) {
  return prisma.reservation.create({
    data: {
      userId: USER.id,
      carId: CAR.id,
      parkingSpotId,
      date: new Date(`${date}T00:00:00.000Z`),
      status: "RESERVED",
    },
  });
}

describe("parking-reservation.getAvailableParkingSpots", () => {
  test("should list spots that are free for the requested day only", async () => {
    const targetDate = "2099-08-01";

    await createReservation(RESERVED_SPOT.id, targetDate);
    await createReservation(FREE_SPOT.id, "2099-08-02");

    const result = await call(
      appRouter.getAvailableParkingSpots,
      { date: targetDate },
      context,
    );

    const spotNames = result.parkingSpots.map(
      (parkingSpot) => parkingSpot.name,
    );

    expect(result.date).toBe(targetDate);
    expect(spotNames).toContain(FREE_SPOT.name);
    expect(spotNames).not.toContain(RESERVED_SPOT.name);
    expect(result.remainingSpots).toBe(result.parkingSpots.length);
  });

  test("should default to today's date when no date is sent", async () => {
    const today = getCurrentReservationDateString();

    await createReservation(FREE_SPOT.id, today);

    const result = await call(
      appRouter.getAvailableParkingSpots,
      undefined,
      context,
    );

    const spotNames = result.parkingSpots.map(
      (parkingSpot) => parkingSpot.name,
    );

    expect(result.date).toBe(today);
    expect(spotNames).toContain(RESERVED_SPOT.name);
    expect(spotNames).not.toContain(FREE_SPOT.name);
  });

  test("should default to today's date when date is an empty string", async () => {
    const today = getCurrentReservationDateString();

    await createReservation(FREE_SPOT.id, today);

    const result = await call(
      appRouter.getAvailableParkingSpots,
      { date: "" },
      context,
    );

    const spotNames = result.parkingSpots.map(
      (parkingSpot) => parkingSpot.name,
    );

    expect(result.date).toBe(today);
    expect(spotNames).toContain(RESERVED_SPOT.name);
    expect(spotNames).not.toContain(FREE_SPOT.name);
  });

  test("should throw BAD_REQUEST on invalid date format", async () => {
    await expect(
      call(appRouter.getAvailableParkingSpots, { date: "31-03-2026" }, context),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
