import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import prisma, { ReservationStatus } from "@hitachi2/db";
import { call } from "@orpc/server";
import { appRouter } from "../../src/routers/index";
import {
  cleanupUsers,
  createAuthedContext,
  createCar,
  createEmployee,
  createSecretary,
  createSpot,
  seedCars,
  seedSpots,
  seedUsers,
} from "../helpers";

const SECRETARY = createSecretary({ id: "test-reservations-secretary" });
const EMPLOYEE = createEmployee({ id: "test-reservations-employee" });

const CAR = createCar(EMPLOYEE.id, { id: "test-reservations-car", licensePlate: "RES-001-AA" });

const secretaryCtx = createAuthedContext(SECRETARY);
const employeeCtx = createAuthedContext(EMPLOYEE);

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

  await seedUsers(SECRETARY, EMPLOYEE);
  await seedCars(CAR);
  await seedSpots(
    createSpot({ id: "test-res-spot-1", name: "RES-SPOT-01" }),
    createSpot({ id: "test-res-spot-2", name: "RES-SPOT-02", charger: true }),
  );
});

afterAll(async () => {
  await prisma.reservation.deleteMany({
    where: { parkingSpotId: { startsWith: "test-res-" } },
  });
  await prisma.parkingSpot.deleteMany({
    where: { id: { startsWith: "test-res-" } },
  });
  await prisma.car.deleteMany({ where: { id: CAR.id } });
  await cleanupUsers(SECRETARY, EMPLOYEE);
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
