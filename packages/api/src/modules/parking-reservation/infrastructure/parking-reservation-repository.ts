import type { IReservationRepository } from "@api/types";
import prisma, { Prisma, ReservationStatus, UserRole } from "@hitachi2/db";

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

export class PrismaReservationRepository implements IReservationRepository {
  async findReservationActor(userId: string) {
    const car = await prisma.car.findFirst({
      where: { userId },
      orderBy: { id: "asc" },
      select: { id: true, userId: true },
    });

    if (!car) return null;

    return { userId: car.userId, carId: car.id };
  }

  async findReservedSpotIdsForDate(date: Date): Promise<string[]> {
    const { start, end } = getReservationDayRange(date);

    const reservations = await prisma.reservation.findMany({
      where: {
        date: { gte: start, lt: end },
        status: ReservationStatus.RESERVED,
      },
      select: { parkingSpotId: true },
    });

    return reservations.map((r) => r.parkingSpotId);
  }

  async findFirstAvailableSpot(excludedSpotIds: string[]) {
    return prisma.parkingSpot.findFirst({
      where: {
        available: true,
        ...(excludedSpotIds.length > 0 ? { id: { notIn: excludedSpotIds } } : {}),
      },
      orderBy: { name: "asc" },
      select: parkingSpotSummarySelect,
    });
  }

  async findAvailableSpots(excludedSpotIds: string[]) {
    return prisma.parkingSpot.findMany({
      where: {
        available: true,
        ...(excludedSpotIds.length > 0 ? { id: { notIn: excludedSpotIds } } : {}),
      },
      orderBy: { name: "asc" },
      select: parkingSpotSummarySelect,
    });
  }

  async countAvailableParkingSpots(): Promise<number> {
    return prisma.parkingSpot.count({ where: { available: true } });
  }

  async createReservation(input: { userId: string; carId: string; parkingSpotId: string; date: Date }) {
    return prisma.reservation.create({
      data: {
        ...input,
        status: ReservationStatus.RESERVED,
      },
      select: {
        id: true,
        parkingSpot: { select: parkingSpotSummarySelect },
      },
    });
  }

  async findAndCreateReservation(
    date: Date,
    actor: { userId: string; carId: string },
  ): Promise<{
    id: string;
    parkingSpot: { id: string; name: string; charger: boolean };
    remainingSpots: number;
  } | null> {
    const { start, end } = getReservationDayRange(date);

    try {
      return await prisma.$transaction(
        async (tx) => {
          const reservations = await tx.reservation.findMany({
            where: {
              date: { gte: start, lt: end },
              status: ReservationStatus.RESERVED,
            },
            select: { parkingSpotId: true },
          });

          const reservedSpotIds = reservations.map((r) => r.parkingSpotId);

          const spot = await tx.parkingSpot.findFirst({
            where: {
              available: true,
              ...(reservedSpotIds.length > 0 ? { id: { notIn: reservedSpotIds } } : {}),
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
                status: ReservationStatus.RESERVED,
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
      return null;
    }
  }

  async findReservationById(id: string) {
    return prisma.reservation.findUnique({
      where: { id },
      select: { id: true, userId: true, status: true },
    });
  }

  async checkInReservation(reservationId: string) {
    return prisma.$transaction(async (tx) => {
      await tx.reservation.update({
        where: { id: reservationId },
        data: { status: ReservationStatus.COMPLETED },
      });

      return tx.checkIn.create({
        data: { reservationId },
        select: { checkedAt: true },
      });
    });
  }

  async getUserReservations(userId: string) {
    const [reservationCount, user] = await Promise.all([
      prisma.reservation.count({
        where: { userId, status: ReservationStatus.RESERVED },
      }),
      prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
    ]);

    return { reservationCount, role: user?.role ?? UserRole.EMPLOYEE };
  }
}
