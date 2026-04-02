import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import prisma, { UserRole } from "@hitachi2/db";
import { call } from "@orpc/server";
import { appRouter } from "../../src/routers/index";
import { createAuthedContext, createEmployee, createManager, createSecretary, seedUsers } from "../helpers";

const SECRETARY = createSecretary({ id: "test-delete-user-secretary" });
const EMPLOYEE_TO_DELETE = createEmployee({ id: "test-delete-user-victim", name: "Employee To Delete" });
const MANAGER = createManager({ id: "test-delete-user-manager" });
const EMPLOYEE = createEmployee({ id: "test-delete-user-employee" });

const secretaryCtx = createAuthedContext(SECRETARY);
const employeeCtx = createAuthedContext(EMPLOYEE);
const managerCtx = createAuthedContext(MANAGER);

beforeAll(async () => {
  await prisma.user.deleteMany({
    where: { id: { in: [SECRETARY.id, EMPLOYEE_TO_DELETE.id, MANAGER.id, EMPLOYEE.id] } },
  });
  await seedUsers(SECRETARY, EMPLOYEE_TO_DELETE, MANAGER, EMPLOYEE);
});

afterAll(async () => {
  await prisma.user.deleteMany({
    where: { id: { in: [SECRETARY.id, MANAGER.id, EMPLOYEE.id] } },
  });
});

describe("account router - deleteUser", () => {
  test("should delete user for secretary", async () => {
    await call(appRouter.deleteUser, { userId: EMPLOYEE_TO_DELETE.id }, secretaryCtx);

    const deleted = await prisma.user.findUnique({
      where: { id: EMPLOYEE_TO_DELETE.id },
    });
    expect(deleted).toBeNull();
  });

  test("should throw FORBIDDEN for manager", async () => {
    const uniqueId = Date.now().toString();
    const victimId = `test-delete-user-victim-2-${uniqueId}`;
    await prisma.user.create({
      data: {
        id: victimId,
        name: "Victim 2",
        email: `test-delete-victim-2-${uniqueId}@test.com`,
        emailVerified: true,
        role: UserRole.EMPLOYEE,
      },
    });

    expect(call(appRouter.deleteUser, { userId: victimId }, managerCtx)).rejects.toThrow("Access denied");
  });

  test("should throw FORBIDDEN for employee", async () => {
    expect(call(appRouter.deleteUser, { userId: EMPLOYEE.id }, employeeCtx)).rejects.toThrow("Access denied");
  });

  test("should delete user's cars when user is deleted", async () => {
    const victimId = "test-delete-user-victim-3";
    const carId = "test-delete-car-3";
    await prisma.user.create({
      data: {
        id: victimId,
        name: "Victim 3",
        email: "test-delete-victim-3@test.com",
        emailVerified: true,
        role: UserRole.EMPLOYEE,
        cars: {
          create: {
            id: carId,
            name: "Car to delete",
            licensePlate: "DEL-003-AA",
            electric: false,
          },
        },
      },
    });

    await call(appRouter.deleteUser, { userId: victimId }, secretaryCtx);

    const deletedCar = await prisma.car.findUnique({
      where: { id: carId },
    });
    expect(deletedCar).toBeNull();
  });

  test("should delete user's reservations when user is deleted", async () => {
    const uniqueId = Date.now().toString();

    const victimId = `test-delete-user-victim-4-${uniqueId}`;
    const carId = `test-delete-car-4-${uniqueId}`;
    const reservationId = `test-delete-reservation-4-${uniqueId}`;
    const spotId = `test-delete-spot-4-${uniqueId}`;

    await prisma.parkingSpot.create({
      data: { id: spotId, name: `DEL-SPOT-04-${uniqueId}`, charger: false, available: true },
    });

    await prisma.user.create({
      data: {
        id: victimId,
        name: "Victim 4",
        email: "test-delete-victim-4@test.com",
        emailVerified: true,
        role: UserRole.EMPLOYEE,
        cars: {
          create: {
            id: carId,
            name: "Car to delete",
            licensePlate: "DEL-004-AA",
            electric: false,
          },
        },
        reservations: {
          create: {
            id: reservationId,
            parkingSpotId: spotId,
            carId,
            date: new Date(),
            status: "RESERVED",
          },
        },
      },
    });

    await call(appRouter.deleteUser, { userId: victimId }, secretaryCtx);

    const deletedReservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });
    expect(deletedReservation).toBeNull();
  });
});
