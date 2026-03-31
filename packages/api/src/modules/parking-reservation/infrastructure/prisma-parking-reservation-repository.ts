import type { ParkingReservationRepository } from "@api/types";
import prisma, { Prisma, type ReservationStatus } from "@hitachi2/db";

const parkingSpotSummarySelect = {
  id: true,
  name: true,
  charger: true,
} as const;

function getReservationDayRange(date: Date) {
  const start = new Date(date);
  const end = new Date(date);
  end.setUTCDate(end.getUTCDate() + 1);

  return { start, end };
}

export const prismaParkingReservationRepository = {
  async findReservationActor() {
    const car = await prisma.car.findFirst({
      orderBy: {
        id: "asc",
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!car) {
      return null;
    }

    return {
      userId: car.userId,
      carId: car.id,
    };
  },
  async findReservedSpotIdsForDate(date) {
    const { start, end } = getReservationDayRange(date);

    const reservations = await prisma.reservation.findMany({
      where: {
        date: {
          gte: start,
          lt: end,
        },
        status: "RESERVED",
      },
      select: {
        parkingSpotId: true,
      },
    });

    return reservations.map((reservation) => reservation.parkingSpotId);
  },
  async findFirstAvailableSpot(excludedSpotIds) {
    return prisma.parkingSpot.findFirst({
      where: {
        available: true,
        ...(excludedSpotIds.length > 0
          ? { id: { notIn: excludedSpotIds } }
          : {}),
      },
      orderBy: {
        name: "asc",
      },
      select: parkingSpotSummarySelect,
    });
  },
  async findAvailableSpots(excludedSpotIds) {
    return prisma.parkingSpot.findMany({
      where: {
        available: true,
        ...(excludedSpotIds.length > 0
          ? { id: { notIn: excludedSpotIds } }
          : {}),
      },
      orderBy: {
        name: "asc",
      },
      select: parkingSpotSummarySelect,
    });
  },
  async countAvailableParkingSpots() {
    return prisma.parkingSpot.count({
      where: {
        available: true,
      },
    });
  },
  async createReservation(input) {
    return prisma.reservation.create({
      data: {
        userId: input.userId,
        carId: input.carId,
        parkingSpotId: input.parkingSpotId,
        date: input.date,
        status: "RESERVED",
      },
      select: {
        id: true,
        parkingSpot: {
          select: parkingSpotSummarySelect,
        },
      },
    });
  },
  async findAndCreateReservation(date, actor) {
    const { start, end } = getReservationDayRange(date);

    try {
      return await prisma.$transaction(
        async (tx) => {
          const reservations = await tx.reservation.findMany({
            where: {
              date: { gte: start, lt: end },
              status: "RESERVED",
            },
            select: { parkingSpotId: true },
          });

          const reservedSpotIds = reservations.map((r) => r.parkingSpotId);

          const spot = await tx.parkingSpot.findFirst({
            where: {
              available: true,
              ...(reservedSpotIds.length > 0
                ? { id: { notIn: reservedSpotIds } }
                : {}),
            },
            orderBy: { name: "asc" },
            select: parkingSpotSummarySelect,
          });

          if (!spot) return null;

          const [reservation, remainingSpots] = await Promise.all([
            tx.reservation.create({
              data: {
                userId: actor.userId,
                carId: actor.carId,
                parkingSpotId: spot.id,
                date,
                status: "RESERVED",
              },
              select: {
                id: true,
                parkingSpot: { select: parkingSpotSummarySelect },
              },
            }),
            tx.parkingSpot.count({
              where: {
                available: true,
                id: { notIn: [...reservedSpotIds, spot.id] },
              },
            }),
          ]);

          return { ...reservation, remainingSpots };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch {
      // Serialization failure: a concurrent transaction took the last spot
      return null;
    }
  },
  async findReservationById(
    id,
  ): Promise<{ id: string; userId: string; status: ReservationStatus } | null> {
    return prisma.reservation.findUnique({
      where: { id },
      select: { id: true, userId: true, status: true },
    });
  },
  async checkInReservation(reservationId) {
    const checkIn = await prisma.$transaction(async (tx) => {
      await tx.reservation.update({
        where: { id: reservationId },
        data: { status: "COMPLETED" },
      });

      return tx.checkIn.create({
        data: { reservationId },
        select: { checkedAt: true },
      });
    });

    return checkIn;
  },
} satisfies ParkingReservationRepository;
