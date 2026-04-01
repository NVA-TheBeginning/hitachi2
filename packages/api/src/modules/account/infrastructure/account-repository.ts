import type { IAccountRepository } from "@api/types";
import prisma, { Prisma, ReservationStatus } from "@hitachi2/db";
import { getMaxReservationsForRole } from "../../../helpers/reservation-limits";
import { CarLicensePlateAlreadyUsedError } from "../domain/errors";

const userCarSelect = {
  id: true,
  name: true,
  licensePlate: true,
  electric: true,
  _count: {
    select: {
      reservations: true,
    },
  },
} as const;

function toUserCarSummary(car: Prisma.CarGetPayload<{ select: typeof userCarSelect }>) {
  return {
    id: car.id,
    name: car.name,
    licensePlate: car.licensePlate,
    electric: car.electric,
    reservationCount: car._count.reservations,
  };
}

function mapUniqueConstraintError(error: unknown, licensePlate: string): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new CarLicensePlateAlreadyUsedError(licensePlate);
  }

  throw error;
}

export class PrismaAccountRepository implements IAccountRepository {
  async getMyAccount(userId: string) {
    const [account, reservationCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          cars: {
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            select: userCarSelect,
          },
        },
      }),
      prisma.reservation.count({
        where: {
          userId,
          status: ReservationStatus.RESERVED,
        },
      }),
    ]);

    if (!account) {
      return null;
    }

    const maxReservations = getMaxReservationsForRole(account.role);

    return {
      ...account,
      cars: account.cars.map(toUserCarSummary),
      reservationQuota: {
        reservationCount,
        maxReservations,
        remainingReservations: Math.max(0, maxReservations - reservationCount),
      },
    };
  }

  async findUserCarById(userId: string, carId: string) {
    const car = await prisma.car.findFirst({
      where: {
        id: carId,
        userId,
      },
      select: userCarSelect,
    });

    return car ? toUserCarSummary(car) : null;
  }

  async createUserCar(input: { userId: string; name: string; licensePlate: string; electric: boolean }) {
    try {
      const car = await prisma.car.create({
        data: input,
        select: userCarSelect,
      });

      return toUserCarSummary(car);
    } catch (error) {
      mapUniqueConstraintError(error, input.licensePlate);
    }
  }

  async updateUserCar(input: { carId: string; name: string; licensePlate: string; electric: boolean }) {
    try {
      const car = await prisma.car.update({
        where: { id: input.carId },
        data: {
          name: input.name,
          licensePlate: input.licensePlate,
          electric: input.electric,
        },
        select: userCarSelect,
      });

      return toUserCarSummary(car);
    } catch (error) {
      mapUniqueConstraintError(error, input.licensePlate);
    }
  }

  async deleteUserCar(carId: string) {
    await prisma.car.delete({
      where: { id: carId },
    });
  }
}
