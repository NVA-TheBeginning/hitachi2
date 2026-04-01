import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { toReservationDate } from "@api/helpers";
import prisma, { ReservationStatus, UserRole } from "@hitachi2/db";
import { call } from "@orpc/server";

import { appRouter } from "../../src/routers/index";
import { createContext } from "../helpers";

const SUCCESS_DATE = "2099-06-01";
const CONFLICT_DATE = "2099-06-02";

const EMPLOYEE_USER = {
  id: "test-reserve-user-employee",
  name: "Reserve Employee",
  email: "test-reserve-employee@test.com",
  emailVerified: true as const,
  role: UserRole.EMPLOYEE,
};

const MANAGER_USER = {
  id: "test-reserve-user-manager",
  name: "Reserve Manager",
  email: "test-reserve-manager@test.com",
  emailVerified: true as const,
  role: UserRole.MANAGER,
};

const USER_WITHOUT_CAR = {
  id: "test-reserve-user-no-car",
  name: "Reserve No Car",
  email: "test-reserve-no-car@test.com",
  emailVerified: true as const,
  role: UserRole.EMPLOYEE,
};

const EMPLOYEE_CAR = {
  id: "test-reserve-car-employee",
  userId: EMPLOYEE_USER.id,
  name: "Employee Car",
  licensePlate: "RSV-EMP-AA",
  electric: false,
};

const MANAGER_CAR = {
  id: "test-reserve-car-manager",
  userId: MANAGER_USER.id,
  name: "Manager Car",
  licensePlate: "RSV-MGR-AA",
  electric: true,
};

const employeeContext = createContext(EMPLOYEE_USER);
const managerContext = createContext(MANAGER_USER);

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
        in: [EMPLOYEE_USER.id, MANAGER_USER.id, USER_WITHOUT_CAR.id],
      },
    },
  });
  await prisma.car.deleteMany({
    where: {
      id: {
        in: [EMPLOYEE_CAR.id, MANAGER_CAR.id],
      },
    },
  });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [EMPLOYEE_USER.id, MANAGER_USER.id, USER_WITHOUT_CAR.id],
      },
    },
  });

  await prisma.user.createMany({
    data: [EMPLOYEE_USER, MANAGER_USER, USER_WITHOUT_CAR],
  });
  await prisma.car.createMany({
    data: [EMPLOYEE_CAR, MANAGER_CAR],
  });
});

afterEach(async () => {
  await prisma.reservation.deleteMany({
    where: {
      userId: {
        in: [EMPLOYEE_USER.id, MANAGER_USER.id, USER_WITHOUT_CAR.id],
      },
    },
  });
});

afterAll(async () => {
  await prisma.reservation.deleteMany({
    where: {
      userId: {
        in: [EMPLOYEE_USER.id, MANAGER_USER.id, USER_WITHOUT_CAR.id],
      },
    },
  });
  await prisma.car.deleteMany({
    where: {
      id: {
        in: [EMPLOYEE_CAR.id, MANAGER_CAR.id],
      },
    },
  });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [EMPLOYEE_USER.id, MANAGER_USER.id, USER_WITHOUT_CAR.id],
      },
    },
  });
});

describe("parking-reservation.reserveParkingSpot", () => {
  test("should reserve the first available spot for the authenticated user car", async () => {
    const result = await call(appRouter.reserveParkingSpot, { date: SUCCESS_DATE }, employeeContext);

    expect(result.reservationId).toBeDefined();
    expect(result.parkingSpot.name).toBeDefined();
    expect(result.date).toBe(SUCCESS_DATE);

    const reservation = await prisma.reservation.findUniqueOrThrow({
      where: { id: result.reservationId },
    });

    expect(reservation.userId).toBe(EMPLOYEE_USER.id);
    expect(reservation.carId).toBe(EMPLOYEE_CAR.id);
  });

  test("should throw UNAUTHORIZED when not authenticated", async () => {
    await expect(
      call(appRouter.reserveParkingSpot, { date: SUCCESS_DATE }, unauthenticatedContext),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  test("should throw PRECONDITION_FAILED when the user has no car", async () => {
    await expect(
      call(appRouter.reserveParkingSpot, { date: SUCCESS_DATE }, createContext(USER_WITHOUT_CAR)),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });

  test("should throw CONFLICT when no spot is available", async () => {
    const spots = await prisma.parkingSpot.findMany({
      where: { available: true },
      select: { id: true },
    });

    await prisma.reservation.createMany({
      data: spots.map((spot) => ({
        userId: MANAGER_USER.id,
        carId: MANAGER_CAR.id,
        parkingSpotId: spot.id,
        date: toReservationDate(CONFLICT_DATE),
        status: ReservationStatus.RESERVED,
      })),
    });

    await expect(call(appRouter.reserveParkingSpot, { date: CONFLICT_DATE }, employeeContext)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  test("should throw BAD_REQUEST on invalid date format", async () => {
    await expect(call(appRouter.reserveParkingSpot, { date: "01-06-2099" }, employeeContext)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  test("should throw FORBIDDEN when employee exceeds 5 reservations", async () => {
    const spot = await prisma.parkingSpot.findFirstOrThrow({
      where: { available: true },
      select: { id: true },
    });

    await prisma.reservation.createMany({
      data: Array.from({ length: 5 }, (_, index) => ({
        userId: EMPLOYEE_USER.id,
        carId: EMPLOYEE_CAR.id,
        parkingSpotId: spot.id,
        date: toReservationDate(`2099-07-0${index + 1}`),
        status: ReservationStatus.RESERVED,
      })),
    });

    await expect(call(appRouter.reserveParkingSpot, { date: "2099-07-07" }, employeeContext)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  test("should allow manager to exceed the employee limit", async () => {
    const spot = await prisma.parkingSpot.findFirstOrThrow({
      where: { available: true },
      select: { id: true },
    });

    await prisma.reservation.createMany({
      data: Array.from({ length: 5 }, (_, index) => ({
        userId: MANAGER_USER.id,
        carId: MANAGER_CAR.id,
        parkingSpotId: spot.id,
        date: toReservationDate(`2099-08-0${index + 1}`),
        status: ReservationStatus.RESERVED,
      })),
    });

    const result = await call(appRouter.reserveParkingSpot, { date: "2099-08-07" }, managerContext);

    expect(result.reservationId).toBeDefined();
  });
});
