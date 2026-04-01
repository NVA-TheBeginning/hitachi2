import type { IAccountRepository } from "@api/types";
import { CarNotFoundError } from "../domain/errors";

export async function updateMyCar(
  repository: IAccountRepository,
  input: {
    userId: string;
    carId: string;
    name: string;
    licensePlate: string;
    electric: boolean;
  },
) {
  const car = await repository.findUserCarById(input.userId, input.carId);

  if (!car) {
    throw new CarNotFoundError(input.carId);
  }

  return repository.updateUserCar({
    carId: input.carId,
    name: input.name,
    licensePlate: input.licensePlate,
    electric: input.electric,
  });
}
