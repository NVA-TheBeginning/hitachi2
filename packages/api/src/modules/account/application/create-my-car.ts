import type { IAccountRepository } from "@api/types";

export async function createMyCar(
  repository: IAccountRepository,
  input: {
    userId: string;
    name: string;
    licensePlate: string;
    electric: boolean;
  },
) {
  return repository.createUserCar(input);
}
