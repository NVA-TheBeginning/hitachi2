import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { toReservationDate } from "@api/helpers";
import prisma, { ReservationStatus, UserRole } from "@hitachi2/db";
import { call } from "@orpc/server";
import { appRouter } from "../../src/routers/index";
import { createContext } from "../helpers";

const TEST_USER = {
  id: "test-my-reservations-user",
  name: "Reservation Owner",
  email: "test-my-reservations@test.com",
  emailVerified: true as const,
  role: UserRole.EMPLOYEE,
};

const OTHER_USER = {
  id: "test-my-reservations-other-user",
  name: "Other User",
  email: "test-my-reservations-other@test.com",
  emailVerified: true as const,
  role: UserRole.EMPLOYEE,
};

const TEST_CAR = {
  id: "test-my-reservations-car",
  userId: TEST_USER.id,
  name: "Owner car",
  licensePlate: "MR-001-AA",
  electric: false,
};

const OTHER_CAR = {
  id: "test-my-reservations-other-car",
  userId: OTHER_USER.id,
  name: "Other car",
  licensePlate: "MR-002-AA",
  electric: true,
};

beforeAll(async () => {
  await prisma.car.deleteMany({ where: { userId: { in: [TEST_USER.id, OTHER_USER.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [TEST_USER.id, OTHER_USER.id] } } });
  await prisma.user.createMany({ data: [TEST_USER, OTHER_USER] });
  await prisma.car.createMany({ data: [TEST_CAR, OTHER_CAR] });
});

afterAll(async () => {
  await prisma.reservation.deleteMany({ where: { userId: { in: [TEST_USER.id, OTHER_USER.id] } } });
  await prisma.car.deleteMany({ where: { userId: { in: [TEST_USER.id, OTHER_USER.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [TEST_USER.id, OTHER_USER.id] } } });
});

afterEach(async () => {
  await prisma.reservation.deleteMany({ where: { userId: { in: [TEST_USER.id, OTHER_USER.id] } } });
});

const userCtx = createContext(TEST_USER);

async function getTwoAvailableSpots() {
  const spots = await prisma.parkingSpot.findMany({
    where: { available: true },
    orderBy: { name: "asc" },
    take: 2,
    select: { id: true, name: true, charger: true },
  });

  expect(spots).toHaveLength(2);

  return spots;
}

describe("parking-reservation.my-reservations", () => {
  test("should list only my active reservations ordered by date", async () => {
    const [spot1, spot2] = await getTwoAvailableSpots();
    if (!spot1 || !spot2) throw new Error("Not enough parking spots available for the test");

    await prisma.reservation.createMany({
      data: [
        {
          id: "test-my-reservations-1",
          userId: TEST_USER.id,
          carId: TEST_CAR.id,
          parkingSpotId: spot2.id,
          date: toReservationDate("2099-08-02"),
          status: ReservationStatus.RESERVED,
        },
        {
          id: "test-my-reservations-2",
          userId: TEST_USER.id,
          carId: TEST_CAR.id,
          parkingSpotId: spot1.id,
          date: toReservationDate("2099-08-01"),
          status: ReservationStatus.RESERVED,
        },
        {
          id: "test-my-reservations-3",
          userId: TEST_USER.id,
          carId: TEST_CAR.id,
          parkingSpotId: spot1.id,
          date: toReservationDate("2099-08-03"),
          status: ReservationStatus.CANCELLED,
        },
        {
          id: "test-my-reservations-4",
          userId: OTHER_USER.id,
          carId: OTHER_CAR.id,
          parkingSpotId: spot2.id,
          date: toReservationDate("2099-08-04"),
          status: ReservationStatus.RESERVED,
        },
      ],
    });

    const result = await call(appRouter.getMyReservations, undefined, userCtx);

    expect(result).toHaveLength(2);
    expect(result.map((reservation) => reservation.id)).toEqual(["test-my-reservations-2", "test-my-reservations-1"]);
    expect(result[0]?.car.name).toBe(TEST_CAR.name);
    expect(result[0]?.parkingSpot.name).toBe(spot1?.name);
  });

  test("should delete one of my active reservations", async () => {
    const [spot] = await getTwoAvailableSpots();
    if (!spot) throw new Error("No parking spots available for the test");

    await prisma.reservation.create({
      data: {
        id: "test-my-reservations-delete",
        userId: TEST_USER.id,
        carId: TEST_CAR.id,
        parkingSpotId: spot.id,
        date: toReservationDate("2099-09-01"),
        status: ReservationStatus.RESERVED,
      },
    });

    const result = await call(appRouter.deleteMyReservation, { reservationId: "test-my-reservations-delete" }, userCtx);

    expect(result).toEqual({ reservationId: "test-my-reservations-delete" });

    const deletedReservation = await prisma.reservation.findUnique({
      where: { id: "test-my-reservations-delete" },
    });

    expect(deletedReservation).toBeNull();
  });

  test("should reject deletion of another user's reservation", async () => {
    const [spot] = await getTwoAvailableSpots();
    if (!spot) throw new Error("No parking spots available for the test");

    await prisma.reservation.create({
      data: {
        id: "test-my-reservations-foreign",
        userId: OTHER_USER.id,
        carId: OTHER_CAR.id,
        parkingSpotId: spot.id,
        date: toReservationDate("2099-10-01"),
        status: ReservationStatus.RESERVED,
      },
    });

    expect(
      call(appRouter.deleteMyReservation, { reservationId: "test-my-reservations-foreign" }, userCtx),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
