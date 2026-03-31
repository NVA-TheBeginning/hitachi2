import prisma from "@hitachi2/db";

import type {
  ParkingReservationRepository,
  ReservationSummary,
} from "../application/reserve-parking-spot";

function getReservationDayRange(date: Date) {
  const start = new Date(date);
  const end = new Date(date);
  end.setUTCDate(end.getUTCDate() + 1);

  return { start, end };
}

export const prismaParkingReservationRepository: ParkingReservationRepository =
  {
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
        select: {
          id: true,
          name: true,
          charger: true,
        },
      });
    },
    async countAvailableParkingSpots() {
      return prisma.parkingSpot.count({
        where: {
          available: true,
        },
      });
    },
    async createReservation(input): Promise<ReservationSummary> {
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
            select: {
              id: true,
              name: true,
              charger: true,
            },
          },
        },
      });
    },
  };
