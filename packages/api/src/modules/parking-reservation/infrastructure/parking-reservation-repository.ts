import type { IReservationRepository, ReservationActor } from "@api/types";
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

function buildAvailableSpotWhere(reservedSpotIds: string[], charger?: boolean) {
  return {
    available: true,
    ...(typeof charger === "boolean" ? { charger } : {}),
    ...(reservedSpotIds.length > 0 ? { id: { notIn: reservedSpotIds } } : {}),
  };
}

export class PrismaReservationRepository implements IReservationRepository {
  async findReservationActor(userId: string, carId?: string) {
    const car = await prisma.car.findFirst({
      where: {
        userId,
        ...(carId ? { id: carId } : {}),
      },
      orderBy: { id: "asc" },
      select: { id: true, userId: true, electric: true },
    });

    if (!car) return null;

    return { userId: car.userId, carId: car.id, electric: car.electric };
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

  async releaseUncheckedReservations(date: Date): Promise<void> {
    const { start, end } = getReservationDayRange(date);

    const noShowSpots = await prisma.reservation.findMany({
      where: { date: { gte: start, lt: end }, status: ReservationStatus.NO_SHOW },
      select: { parkingSpotId: true },
    });

    const excludedSpotIds = noShowSpots.map((r) => r.parkingSpotId);

    await prisma.reservation.updateMany({
      where: {
        date: { gte: start, lt: end },
        status: ReservationStatus.RESERVED,
        parkingSpotId: { notIn: excludedSpotIds },
      },
      data: { status: ReservationStatus.NO_SHOW },
    });
  }

  async findFirstAvailableSpot(excludedSpotIds: string[]) {
    return prisma.parkingSpot.findFirst({
      where: buildAvailableSpotWhere(excludedSpotIds),
      orderBy: { name: "asc" },
      select: parkingSpotSummarySelect,
    });
  }

  async findAvailableSpots(excludedSpotIds: string[]) {
    return prisma.parkingSpot.findMany({
      where: buildAvailableSpotWhere(excludedSpotIds),
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
    actor: ReservationActor,
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

          const preferredSpot = await tx.parkingSpot.findFirst({
            where: buildAvailableSpotWhere(reservedSpotIds, !!actor.electric),
            orderBy: { name: "asc" },
            select: parkingSpotSummarySelect,
          });

          const fallbackSpot =
            actor.electric && !preferredSpot
              ? await tx.parkingSpot.findFirst({
                  where: buildAvailableSpotWhere(reservedSpotIds, false),
                  orderBy: { name: "asc" },
                  select: parkingSpotSummarySelect,
                })
              : null;

          const spot = preferredSpot ?? fallbackSpot;

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

  async findParkingSpotById(spotId: string) {
    return prisma.parkingSpot.findUnique({
      where: { id: spotId },
      select: parkingSpotSummarySelect,
    });
  }

  async findTodayReservationForUserAndSpot(userId: string, spotId: string, today: Date) {
    const { start, end } = getReservationDayRange(today);
    return prisma.reservation.findFirst({
      where: {
        userId,
        parkingSpotId: spotId,
        date: { gte: start, lt: end },
      },
      select: { id: true, status: true },
    });
  }

  async findAllParkingSpots() {
    return prisma.parkingSpot.findMany({
      orderBy: { name: "asc" },
      select: parkingSpotSummarySelect,
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

  async getNoShowStats(input: { userId?: string; startDate?: Date; endDate?: Date }) {
    const { userId, startDate, endDate } = input;

    const commonWhere = {
      ...(userId ? { userId } : {}),
      ...(startDate || endDate
        ? {
            date: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lt: endDate } : {}),
            },
          }
        : {}),
    };

    const [totalReservations, noShowCount] = await Promise.all([
      prisma.reservation.count({
        where: {
          ...commonWhere,
          status: { in: [ReservationStatus.NO_SHOW, ReservationStatus.COMPLETED] },
        },
      }),
      prisma.reservation.count({
        where: { ...commonWhere, status: ReservationStatus.NO_SHOW },
      }),
    ]);

    const rate = totalReservations === 0 ? 0 : (noShowCount / totalReservations) * 100;

    return {
      totalReservations,
      noShowCount,
      completedCount: totalReservations - noShowCount,
      rate,
    };
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
