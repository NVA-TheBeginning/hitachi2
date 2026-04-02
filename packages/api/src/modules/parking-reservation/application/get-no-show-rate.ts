import { toReservationDate } from "@api/helpers";
import type { IReservationRepository } from "@api/types";

export async function getNoShowRate(
  repository: IReservationRepository,
  input: { userId: string; startDate?: string; endDate?: string },
) {
  const startDate = input.startDate ? toReservationDate(input.startDate) : undefined;
  const endDate = input.endDate ? toReservationDate(input.endDate) : undefined;

  return repository.getNoShowStats({ userId: input.userId, startDate, endDate });
}
