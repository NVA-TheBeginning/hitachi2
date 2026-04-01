import type { IReservationRepository } from "@api/types";

export async function getMyReservations(repository: IReservationRepository, input: { userId: string }) {
  return repository.getMyReservations(input.userId);
}
