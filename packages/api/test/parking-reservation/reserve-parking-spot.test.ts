import { afterEach, describe, expect, test } from "bun:test";
import { toReservationDate } from "@api/helpers";
import prisma from "@hitachi2/db";
import { call } from "@orpc/server";
import { appRouter } from "../../src/routers/index";

const SUCCESS_DATE = "2099-06-01";
const CONFLICT_DATE = "2099-06-02";

const context = {
  context: {
    session: null,
    jobQueue: { send: async () => null },
  },
};

afterEach(async () => {
  await prisma.reservation.deleteMany({
    where: {
      date: {
        in: [toReservationDate(SUCCESS_DATE), toReservationDate(CONFLICT_DATE)],
      },
    },
  });
});

describe("parking-reservation.reserveParkingSpot", () => {
  test("should reserve the first available spot", async () => {
    const result = await call(
      appRouter.reserveParkingSpot,
      { date: SUCCESS_DATE },
      context,
    );

    expect(result.reservationId).toBeDefined();
    expect(result.parkingSpot.name).toBeDefined();
    expect(result.date).toBe(SUCCESS_DATE);
  });

  test("should throw CONFLICT when no spot is available", async () => {
    const actor = await prisma.car.findFirstOrThrow({
      orderBy: { id: "asc" },
      select: { id: true, userId: true },
    });
    const spots = await prisma.parkingSpot.findMany({
      where: { available: true },
      select: { id: true },
    });

    await prisma.reservation.createMany({
      data: spots.map((spot) => ({
        userId: actor.userId,
        carId: actor.id,
        parkingSpotId: spot.id,
        date: toReservationDate(CONFLICT_DATE),
        status: "RESERVED" as const,
      })),
    });

    expect(
      call(appRouter.reserveParkingSpot, { date: CONFLICT_DATE }, context),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  test("should throw BAD_REQUEST on invalid date format", async () => {
    expect(
      call(appRouter.reserveParkingSpot, { date: "01-06-2099" }, context),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
