import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { getCurrentReservationDateString } from "@api/helpers";
import prisma, { ReservationStatus } from "@hitachi2/db";
import { call } from "@orpc/server";
import { releaseAndGetAvailableParkingSpots } from "../../src/modules/parking-reservation/application/release-and-get-available-parking-spots";
import { PrismaReservationRepository } from "../../src/modules/parking-reservation/infrastructure/parking-reservation-repository";
import { appRouter } from "../../src/routers/index";

const USER = {
  id: "test-list-user-1",
  name: "List User",
  email: "test-list-1@test.com",
  emailVerified: true,
};

const CAR = {
  id: "test-list-car-1",
  userId: USER.id,
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
      status: ReservationStatus.RESERVED,
    },
  });
}

describe("parking-reservation.getAvailableParkingSpots", () => {
  test("should list spots that are free for the requested day only", async () => {
    const targetDate = "2099-08-01";

    await createReservation(RESERVED_SPOT.id, targetDate);
    await createReservation(FREE_SPOT.id, "2099-08-02");

    const result = await call(appRouter.getAvailableParkingSpots, { date: targetDate }, context);

    const spotNames = result.parkingSpots.map((parkingSpot) => parkingSpot.name);

    expect(result.date).toBe(targetDate);
    expect(spotNames).toContain(FREE_SPOT.name);
    expect(spotNames).not.toContain(RESERVED_SPOT.name);
    expect(result.remainingSpots).toBe(result.parkingSpots.length);
  });

  test("should default to today's date when no date is sent", async () => {
    const today = getCurrentReservationDateString();

    const result = await call(appRouter.getAvailableParkingSpots, undefined, context);

    expect(result.date).toBe(today);
  });

  test("should default to today's date when date is an empty string", async () => {
    const today = getCurrentReservationDateString();

    const result = await call(appRouter.getAvailableParkingSpots, { date: "" }, context);

    expect(result.date).toBe(today);
  });

  test("should free RESERVED spots past 11am on the same day and mark them NO_SHOW", async () => {
    const today = getCurrentReservationDateString();
    const reservation = await createReservation(RESERVED_SPOT.id, today);

    const after11am = new Date(`${today}T11:30:00.000Z`);
    const result = await releaseAndGetAvailableParkingSpots(
      new PrismaReservationRepository(),
      { date: today },
      after11am,
    );

    const spotNames = result.parkingSpots.map((s) => s.name);
    expect(spotNames).toContain(RESERVED_SPOT.name);

    const updated = await prisma.reservation.findUniqueOrThrow({
      where: { id: reservation.id },
      select: { status: true },
    });
    expect(updated.status).toBe(ReservationStatus.NO_SHOW);
  });

  test("should NOT free a reservation made after 11am when checking again", async () => {
    const today = getCurrentReservationDateString();
    const after11am = new Date(`${today}T11:30:00.000Z`);
    const repo = new PrismaReservationRepository();

    // Step 1: original reservation exists before 11am, gets freed
    await createReservation(RESERVED_SPOT.id, today);
    await releaseAndGetAvailableParkingSpots(repo, { date: today }, after11am);

    // Step 2: someone makes a new reservation after 11am on the freed spot
    const newReservation = await createReservation(RESERVED_SPOT.id, today);

    // Step 3: another availability check runs — should NOT free the new reservation
    const result = await releaseAndGetAvailableParkingSpots(repo, { date: today }, after11am);

    const spotNames = result.parkingSpots.map((s) => s.name);
    expect(spotNames).not.toContain(RESERVED_SPOT.name);

    const updated = await prisma.reservation.findUniqueOrThrow({
      where: { id: newReservation.id },
      select: { status: true },
    });
    expect(updated.status).toBe(ReservationStatus.RESERVED);
  });

  test("should keep RESERVED spots before 11am on the same day", async () => {
    const today = getCurrentReservationDateString();
    await createReservation(RESERVED_SPOT.id, today);

    const before11am = new Date(`${today}T10:30:00.000Z`);
    const result = await releaseAndGetAvailableParkingSpots(
      new PrismaReservationRepository(),
      { date: today },
      before11am,
    );

    const spotNames = result.parkingSpots.map((s) => s.name);
    expect(spotNames).not.toContain(RESERVED_SPOT.name);
  });

  test("should throw BAD_REQUEST on invalid date format", async () => {
    await expect(call(appRouter.getAvailableParkingSpots, { date: "31-03-2026" }, context)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });
});
