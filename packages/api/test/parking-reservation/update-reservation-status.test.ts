import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import prisma, { ReservationStatus } from "@hitachi2/db";
import { call } from "@orpc/server";
import { appRouter } from "../../src/routers/index";
import {
  cleanupUsers,
  createAuthedContext,
  createCar,
  createEmployee,
  createManager,
  createSecretary,
  createSpot,
  seedCars,
  seedSpots,
  seedUsers,
} from "../helpers";

const SECRETARY = createSecretary({ id: "test-update-res-status-secretary" });
const EMPLOYEE = createEmployee({ id: "test-update-res-status-employee" });

const CAR = createCar(EMPLOYEE.id, { id: "test-update-res-status-car", licensePlate: "URS-001-AA" });
const SPOT = createSpot({ id: "test-update-res-status-spot", name: "URS-SPOT-01" });

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
  await cleanupUsers(SECRETARY, EMPLOYEE);
});

describe("parking reservation router - finalizeReservation", () => {
  test("should update reservation status to COMPLETED for secretary", async () => {
    await call(appRouter.finalizeReservation, { reservationId, status: ReservationStatus.COMPLETED }, secretaryCtx);

    const updated = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });
    expect(updated?.status).toBe(ReservationStatus.COMPLETED);
  });

  test("should update reservation status to NO_SHOW for secretary", async () => {
    await call(appRouter.finalizeReservation, { reservationId, status: ReservationStatus.NO_SHOW }, secretaryCtx);

    const updated = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });
    expect(updated?.status).toBe(ReservationStatus.NO_SHOW);
  });

  test("should throw FORBIDDEN for manager", async () => {
    const manager = createManager({ id: "mgr-update-123", name: "Manager User" });
    const managerCtx = createAuthedContext(manager);

    expect(
      call(appRouter.finalizeReservation, { reservationId, status: ReservationStatus.CANCELLED }, managerCtx),
    ).rejects.toThrow("Access denied");
  });

  test("should throw FORBIDDEN for employee", async () => {
    expect(
      call(appRouter.finalizeReservation, { reservationId, status: ReservationStatus.CANCELLED }, employeeCtx),
    ).rejects.toThrow("Access denied");
  });
});
