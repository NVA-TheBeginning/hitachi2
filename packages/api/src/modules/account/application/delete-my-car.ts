import type { IAccountRepository } from "@api/types";
import { CarDeletionForbiddenError, CarNotFoundError } from "../domain/errors";

export async function deleteMyCar(repository: IAccountRepository, input: { userId: string; carId: string }) {
  const car = await repository.findUserCarById(input.userId, input.carId);

  if (!car) {
    throw new CarNotFoundError(input.carId);
  }

  if (car.reservationCount > 0) {
    throw new CarDeletionForbiddenError(input.carId);
  }

  await repository.deleteUserCar(input.carId);

  return {
    carId: input.carId,
    deleted: true,
  };
}
