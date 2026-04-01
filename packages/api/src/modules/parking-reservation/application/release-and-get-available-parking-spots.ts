import { getCurrentReservationDateString, toReservationDate } from "@api/helpers";
import type { IReservationRepository } from "@api/types";
import { getAvailableParkingSpots } from "./get-available-parking-spots";

export async function releaseAndGetAvailableParkingSpots(
  repository: IReservationRepository,
  input?: { date?: string },
  now = new Date(),
) {
  const today = getCurrentReservationDateString(now);
  const date = input?.date ?? today;

  if (date === today && now.getUTCHours() >= 11) {
    await repository.releaseUncheckedReservations(toReservationDate(date));
  }

  return getAvailableParkingSpots(repository, input);
}
