import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import prisma, { ReservationStatus, UserRole } from "@hitachi2/db";
import { call } from "@orpc/server";
import { appRouter } from "../../src/routers/index";
import { createContext } from "../helpers";

const SECRETARY = {
  id: "test-delete-res-secretary",
  name: "Secretary User",
  email: "test-delete-res-secretary@test.com",
  emailVerified: true,
  role: UserRole.SECRETARY,
};

const EMPLOYEE = {
  id: "test-delete-res-employee",
  name: "Employee User",
  email: "test-delete-res-employee@test.com",
  emailVerified: true,
  role: UserRole.EMPLOYEE,
};

const CAR = {
  id: "test-delete-res-car",
  userId: EMPLOYEE.id,
  name: "Test Car",
  licensePlate: "DRS-001-AA",
  electric: false,
};

const SPOT = {
  id: "test-delete-res-spot",
  name: "DRS-SPOT-01",
  charger: false,
  available: true,
};

const secretaryCtx = createContext(SECRETARY);
const employeeCtx = createContext(EMPLOYEE);

let reservationId: string;

beforeAll(async () => {
  await prisma.reservation.deleteMany({ where: { parkingSpotId: SPOT.id } });
  await prisma.parkingSpot.deleteMany({ where: { id: SPOT.id } });
  await prisma.car.deleteMany({ where: { id: CAR.id } });
  await prisma.user.deleteMany({
    where: { id: { in: [SECRETARY.id, EMPLOYEE.id] } },
  });

  await prisma.user.createMany({ data: [SECRETARY, EMPLOYEE] });
  await prisma.car.create({ data: CAR });
  await prisma.parkingSpot.create({ data: SPOT });
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
  await prisma.user.deleteMany({
    where: { id: { in: [SECRETARY.id, EMPLOYEE.id] } },
  });
});

describe("parking reservation router - deleteReservation", () => {
  test("should delete reservation for secretary", async () => {
    await call(appRouter.deleteReservation, { reservationId }, secretaryCtx);

    const deleted = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });
    expect(deleted).toBeNull();
  });

  test("should delete reservation for manager", async () => {
    const uniqueId = Date.now().toString();
    const manager = {
      id: `mgr-delete-${uniqueId}`,
      name: "Manager User",
      email: `mgr-delete-${uniqueId}@test.com`,
      role: UserRole.MANAGER,
      emailVerified: true,
    };
    const managerCtx = createContext(manager);

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

    await call(appRouter.deleteReservation, { reservationId: res.id }, managerCtx);

    const deleted = await prisma.reservation.findUnique({
      where: { id: res.id },
    });
    expect(deleted).toBeNull();

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
