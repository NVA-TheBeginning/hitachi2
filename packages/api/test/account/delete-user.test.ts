import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import prisma, { UserRole } from "@hitachi2/db";
import { call } from "@orpc/server";
import { appRouter } from "../../src/routers/index";
import { createContext } from "../helpers";

const SECRETARY = {
  id: "test-delete-user-secretary",
  name: "Secretary User",
  email: "test-delete-secretary@test.com",
  emailVerified: true,
  role: UserRole.SECRETARY,
};

const EMPLOYEE_TO_DELETE = {
  id: "test-delete-user-victim",
  name: "Employee To Delete",
  email: "test-delete-victim@test.com",
  emailVerified: true,
  role: UserRole.EMPLOYEE,
};

const MANAGER = {
  id: "test-delete-user-manager",
  name: "Manager User",
  email: "test-delete-manager@test.com",
  emailVerified: true,
  role: UserRole.MANAGER,
};

const EMPLOYEE = {
  id: "test-delete-user-employee",
  name: "Employee User",
  email: "test-delete-employee@test.com",
  emailVerified: true,
  role: UserRole.EMPLOYEE,
};

const secretaryCtx = createContext(SECRETARY);
const employeeCtx = createContext(EMPLOYEE);
const managerCtx = createContext(MANAGER);

beforeAll(async () => {
  await prisma.user.deleteMany({
    where: { id: { in: [SECRETARY.id, EMPLOYEE_TO_DELETE.id, MANAGER.id, EMPLOYEE.id] } },
  });
  await prisma.user.createMany({
    data: [SECRETARY, EMPLOYEE_TO_DELETE, MANAGER, EMPLOYEE],
  });
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

  test("should delete user for manager", async () => {
    const victimId = "test-delete-user-victim-2";
    await prisma.user.create({
      data: {
        id: victimId,
        name: "Victim 2",
        email: "test-delete-victim-2@test.com",
        emailVerified: true,
        role: UserRole.EMPLOYEE,
      },
    });

    await call(appRouter.deleteUser, { userId: victimId }, managerCtx);

    const deleted = await prisma.user.findUnique({
      where: { id: victimId },
    });
    expect(deleted).toBeNull();
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
