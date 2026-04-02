import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import prisma, { ReservationStatus, UserRole } from "@hitachi2/db";
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

const SECRETARY = createSecretary({ id: "test-delete-res-secretary" });
const EMPLOYEE = createEmployee({ id: "test-delete-res-employee" });

const CAR = createCar(EMPLOYEE.id, { id: "test-delete-res-car" });
const SPOT = createSpot({ id: "test-delete-res-spot", name: "DRS-SPOT-01" });

const secretaryCtx = createAuthedContext(SECRETARY);
const employeeCtx = createAuthedContext(EMPLOYEE);

let reservationId: string;

beforeAll(async () => {
  await prisma.reservation.deleteMany({ where: { parkingSpotId: SPOT.id } });
  await prisma.parkingSpot.deleteMany({ where: { id: SPOT.id } });
  await prisma.car.deleteMany({ where: { id: CAR.id } });
  await prisma.user.deleteMany({
    where: { id: { in: [SECRETARY.id, EMPLOYEE.id] } },
  });

  await seedUsers(SECRETARY, EMPLOYEE);
  await seedCars(CAR);
  await seedSpots(SPOT);
});

beforeEach(async () => {
  await prisma.reservation.deleteMany({ where: { parkingSpotId: SPOT.id } });

  const res = await prisma.reservation.create({
    data: {
      id: "test-delete-res-res",
      userId: EMPLOYEE.id,
      carId: CAR.id,
      parkingSpotId: SPOT.id,
      date: new Date(),
      status: ReservationStatus.RESERVED,
    },
  });
  reservationId = res.id;
});

afterAll(async () => {
  await prisma.reservation.deleteMany({ where: { parkingSpotId: SPOT.id } });
  await prisma.parkingSpot.deleteMany({ where: { id: SPOT.id } });
  await prisma.car.deleteMany({ where: { id: CAR.id } });
  await cleanupUsers(SECRETARY, EMPLOYEE);
});

describe("parking reservation router - deleteReservation", () => {
  test("should delete reservation for secretary", async () => {
    await call(appRouter.deleteReservation, { reservationId }, secretaryCtx);

    const deleted = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });
    expect(deleted).toBeNull();
  });

  test("should throw FORBIDDEN for manager", async () => {
    const uniqueId = Date.now().toString();
    const manager = {
      id: `mgr-delete-${uniqueId}`,
      name: "Manager User",
      email: `mgr-delete-${uniqueId}@test.com`,
      role: UserRole.MANAGER,
      emailVerified: true,
    };
    const managerCtx = createAuthedContext(manager);

    await prisma.user.create({
      data: {
        id: manager.id,
        name: manager.name,
        email: manager.email,
        emailVerified: true,
        role: manager.role,
      },
    });

    const res = await prisma.reservation.create({
      data: {
        id: `test-delete-res-mgr-${uniqueId}`,
        userId: EMPLOYEE.id,
        carId: CAR.id,
        parkingSpotId: SPOT.id,
        date: new Date(),
        status: ReservationStatus.RESERVED,
      },
    });

    expect(call(appRouter.deleteReservation, { reservationId: res.id }, managerCtx)).rejects.toThrow("Access denied");

    await prisma.user.delete({ where: { id: manager.id } });
  });

  test("should throw FORBIDDEN for employee", async () => {
    await expect(call(appRouter.deleteReservation, { reservationId }, employeeCtx)).rejects.toThrow("Access denied");
  });

  test("should delete any reservation (not just own)", async () => {
    const otherEmployeeId = "test-delete-res-other";
    await prisma.user.create({
      data: {
        id: otherEmployeeId,
        name: "Other Employee",
        email: "test-delete-res-other@test.com",
        emailVerified: true,
        role: UserRole.EMPLOYEE,
      },
    });

    const otherRes = await prisma.reservation.create({
      data: {
        id: "test-delete-res-other-res",
        userId: otherEmployeeId,
        carId: CAR.id,
        parkingSpotId: SPOT.id,
        date: new Date(),
        status: ReservationStatus.RESERVED,
      },
    });

    await call(appRouter.deleteReservation, { reservationId: otherRes.id }, secretaryCtx);

    const deleted = await prisma.reservation.findUnique({
      where: { id: otherRes.id },
    });
    expect(deleted).toBeNull();

    await prisma.user.delete({ where: { id: otherEmployeeId } });
  });
});
