import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import prisma, { ReservationStatus, UserRole } from "@hitachi2/db";
import { call } from "@orpc/server";
import { appRouter } from "../../src/routers/index";
import { createContext } from "../helpers";

const SECRETARY = {
  id: "test-update-res-status-secretary",
  name: "Secretary User",
  email: "test-update-res-status-secretary@test.com",
  emailVerified: true,
  role: UserRole.SECRETARY,
};

const EMPLOYEE = {
  id: "test-update-res-status-employee",
  name: "Employee User",
  email: "test-update-res-status-employee@test.com",
  emailVerified: true,
  role: UserRole.EMPLOYEE,
};

const CAR = {
  id: "test-update-res-status-car",
  userId: EMPLOYEE.id,
  name: "Test Car",
  licensePlate: "URS-001-AA",
  electric: false,
};

const SPOT = {
  id: "test-update-res-status-spot",
  name: "URS-SPOT-01",
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
      id: "test-update-res-status-res",
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

describe("parking reservation router - updateReservationStatus", () => {
  test("should update reservation status to COMPLETED for secretary", async () => {
    await call(appRouter.updateReservationStatus, { reservationId, status: ReservationStatus.COMPLETED }, secretaryCtx);

    const updated = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });
    expect(updated?.status).toBe(ReservationStatus.COMPLETED);
  });

  test("should update reservation status to NO_SHOW for secretary", async () => {
    await call(appRouter.updateReservationStatus, { reservationId, status: ReservationStatus.NO_SHOW }, secretaryCtx);

    const updated = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });
    expect(updated?.status).toBe(ReservationStatus.NO_SHOW);
  });

  test("should update reservation status for manager", async () => {
    const manager = {
      id: "mgr-update-123",
      name: "Manager User",
      email: "mgr-update-123@test.com",
      emailVerified: true,
      role: UserRole.MANAGER,
    };
    const managerCtx = createContext(manager);

    await call(appRouter.updateReservationStatus, { reservationId, status: ReservationStatus.CANCELLED }, managerCtx);

    const updated = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });
    expect(updated?.status).toBe(ReservationStatus.CANCELLED);
  });

  test("should throw FORBIDDEN for employee", async () => {
    expect(
      call(appRouter.updateReservationStatus, { reservationId, status: ReservationStatus.CANCELLED }, employeeCtx),
    ).rejects.toThrow("Access denied");
  });
});
