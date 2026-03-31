import type { AccountRepository } from "@api/types";
import {
  AccountNotFoundError,
  CarDeletionForbiddenError,
  CarNotFoundError,
  DuplicateLicensePlateError,
} from "../domain/errors";

function normalizeLicensePlate(licensePlate: string) {
  return licensePlate.trim().toUpperCase();
}

export async function getMyAccount(
  repository: AccountRepository,
  userId: string,
) {
  const account = await repository.findAccountByUserId(userId);

  if (!account) {
    throw new AccountNotFoundError();
  }

  return account;
}

export async function updateMyAccount(
  repository: AccountRepository,
  input: { userId: string; name: string },
) {
  return repository.updateAccountName(input.userId, input.name.trim());
}

export async function createMyCar(
  repository: AccountRepository,
  input: {
    userId: string;
    name: string;
    licensePlate: string;
    electric: boolean;
  },
) {
  const licensePlate = normalizeLicensePlate(input.licensePlate);
  const existingCar = await repository.findCarByLicensePlate(licensePlate);

  if (existingCar) {
    throw new DuplicateLicensePlateError(licensePlate);
  }

  return repository.createCar({
    ...input,
    name: input.name.trim(),
    licensePlate,
  });
}

export async function updateMyCar(
  repository: AccountRepository,
  input: {
    userId: string;
    carId: string;
    name: string;
    licensePlate: string;
    electric: boolean;
  },
) {
  const car = await repository.findCarByIdForUser(input.carId, input.userId);

  if (!car) {
    throw new CarNotFoundError(input.carId);
  }

  const licensePlate = normalizeLicensePlate(input.licensePlate);
  const existingCar = await repository.findCarByLicensePlate(licensePlate);

  if (existingCar && existingCar.id !== input.carId) {
    throw new DuplicateLicensePlateError(licensePlate);
  }

  return repository.updateCar({
    carId: input.carId,
    name: input.name.trim(),
    licensePlate,
    electric: input.electric,
  });
}

export async function deleteMyCar(
  repository: AccountRepository,
  input: { userId: string; carId: string },
) {
  const car = await repository.findCarByIdForUser(input.carId, input.userId);

  if (!car) {
    throw new CarNotFoundError(input.carId);
  }

  const reservationCount = await repository.countReservationsForCar(input.carId);

  if (reservationCount > 0) {
    throw new CarDeletionForbiddenError(input.carId);
  }

  await repository.deleteCar(input.carId);

  return { deleted: true };
}
