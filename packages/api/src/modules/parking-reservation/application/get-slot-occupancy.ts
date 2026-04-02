import { getCurrentReservationDateString, toReservationDate } from "@api/helpers";
import type { IReservationRepository } from "@api/types";

export async function getSlotOccupancy(repository: IReservationRepository, input?: { date?: string }) {
  const dateString = input?.date ?? getCurrentReservationDateString();
  return repository.getSlotOccupancyStats(toReservationDate(dateString));
}
