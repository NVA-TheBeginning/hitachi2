import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import prisma, { ReservationStatus, UserRole } from "@hitachi2/db";
import { call } from "@orpc/server";
import { appRouter } from "../../src/routers/index";
import { createContext } from "../helpers";

const SECRETARY = {
  id: "test-reservations-secretary",
  name: "Secretary User",
  email: "test-reservations-secretary@test.com",
  emailVerified: true,
  role: UserRole.SECRETARY,
};

const EMPLOYEE = {
  id: "test-reservations-employee",
  name: "Employee User",
  email: "test-reservations-employee@test.com",
  emailVerified: true,
  role: UserRole.EMPLOYEE,
};

const CAR = {
  id: "test-reservations-car",
  userId: EMPLOYEE.id,
  name: "Test Car",
  licensePlate: "RES-001-AA",
  electric: false,
};

const secretaryCtx = createContext(SECRETARY);
const employeeCtx = createContext(EMPLOYEE);

beforeAll(async () => {
  await prisma.reservation.deleteMany({
    where: { parkingSpotId: { startsWith: "test-res-" } },
  });
  await prisma.parkingSpot.deleteMany({
    where: { id: { startsWith: "test-res-" } },
  });
  await prisma.car.deleteMany({ where: { id: CAR.id } });
  await prisma.user.deleteMany({
    where: { id: { in: [SECRETARY.id, EMPLOYEE.id] } },
  });

  await prisma.user.createMany({ data: [SECRETARY, EMPLOYEE] });
  await prisma.car.create({ data: CAR });
  await prisma.parkingSpot.createMany({
    data: [
      { id: "test-res-spot-1", name: "RES-SPOT-01", charger: false, available: true },
      { id: "test-res-spot-2", name: "RES-SPOT-02", charger: true, available: true },
    ],
  });
});

afterAll(async () => {
  await prisma.reservation.deleteMany({
    where: { parkingSpotId: { startsWith: "test-res-" } },
  });
  await prisma.parkingSpot.deleteMany({
    where: { id: { startsWith: "test-res-" } },
  });
  await prisma.car.deleteMany({ where: { id: CAR.id } });
  await prisma.user.deleteMany({
    where: { id: { in: [SECRETARY.id, EMPLOYEE.id] } },
  });
});

describe("parking reservation router - getAllReservations", () => {
  test("should return all reservations for secretary", async () => {
    const result = await call(appRouter.getAllReservations, undefined, secretaryCtx);

    expect(result).toBeInstanceOf(Array);
  });

  test("should filter by status for secretary", async () => {
    const result = await call(appRouter.getAllReservations, { status: ReservationStatus.RESERVED }, secretaryCtx);

    for (const res of result) {
      expect(res.status).toBe(ReservationStatus.RESERVED);
    }
  });

  test("should throw FORBIDDEN for employee", async () => {
    await expect(call(appRouter.getAllReservations, undefined, employeeCtx)).rejects.toThrow("Access denied");
  });

  test("should return reservations with car and parkingSpot details", async () => {
    const result = await call(appRouter.getAllReservations, undefined, secretaryCtx);

    if (result.length > 0) {
      const res = result[0];
      if (!res) throw new Error("Expected at least one reservation in the result");
      expect(res.car).toBeDefined();
      expect(res.parkingSpot).toBeDefined();
      expect(res.car.id).toBeDefined();
      expect(res.parkingSpot.id).toBeDefined();
    }
  });

  test("should order by date descending", async () => {
    await prisma.reservation.create({
      data: {
        id: "test-res-new",
        userId: EMPLOYEE.id,
        carId: CAR.id,
        parkingSpotId: "test-res-spot-1",
        date: new Date("2099-01-01"),
        status: ReservationStatus.RESERVED,
      },
    });

    const result = await call(
      appRouter.getAllReservations,
      { startDate: "2099-01-01", endDate: "2099-01-02" },
      secretaryCtx,
    );

    expect(result.length).toBeGreaterThan(0);
    if (!result[0]) throw new Error("Expected at least one reservation in the result");
    expect(new Date(result[0].date).getFullYear()).toBe(2099);
  });
});
