import type { AccountRepository } from "@api/types";
import prisma from "@hitachi2/db";

const carSelect = {
  id: true,
  name: true,
  licensePlate: true,
  electric: true,
  createdAt: true,
  updatedAt: true,
} as const;

function toCarSummary(car: {
  id: string;
  name: string;
  licensePlate: string | null;
  electric: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...car,
    licensePlate: car.licensePlate ?? "",
  };
}

export const prismaAccountRepository = {
  async findAccountByUserId(userId) {
    const account = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        cars: {
          orderBy: {
            createdAt: "asc",
          },
          select: carSelect,
        },
      },
    });

    if (!account) {
      return null;
    }

    return {
      ...account,
      cars: account.cars.map(toCarSummary),
    };
  },
  async updateAccountName(userId, name) {
    const account = await prisma.user.update({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        cars: {
          orderBy: {
            createdAt: "asc",
          },
          select: carSelect,
        },
      },
      data: { name },
    });

    return {
      ...account,
      cars: account.cars.map(toCarSummary),
    };
  },
  async findCarByIdForUser(carId, userId) {
    const car = await prisma.car.findFirst({
      where: {
        id: carId,
        userId,
      },
      select: carSelect,
    });

    if (!car) {
      return null;
    }

    return toCarSummary(car);
  },
  async findCarByLicensePlate(licensePlate) {
    return prisma.car.findUnique({
      where: { licensePlate },
      select: {
        id: true,
        userId: true,
      },
    });
  },
  async createCar(input) {
    const car = await prisma.car.create({
      data: input,
      select: carSelect,
    });

    return toCarSummary(car);
  },
  async updateCar(input) {
    const car = await prisma.car.update({
      where: {
        id: input.carId,
      },
      data: {
        name: input.name,
        licensePlate: input.licensePlate,
        electric: input.electric,
      },
      select: carSelect,
    });

    return toCarSummary(car);
  },
  async countReservationsForCar(carId) {
    return prisma.reservation.count({
      where: {
        carId,
      },
    });
  },
  async deleteCar(carId) {
    await prisma.car.delete({
      where: {
        id: carId,
      },
    });
  },
} satisfies AccountRepository;
