import { getCurrentReservationDateString, toReservationDate } from "@api/helpers";
import type { IReservationRepository } from "@api/types";
import { NO_SHOW_RELEASE_HOUR } from "../../../config/reservation-policy";
import { getAvailableParkingSpots } from "./get-available-parking-spots";

export async function releaseAndGetAvailableParkingSpots(
  repository: IReservationRepository,
  input?: { date?: string },
  now = new Date(),
) {
  const today = getCurrentReservationDateString(now);
  const date = input?.date ?? today;

  if (date === today && now.getUTCHours() >= NO_SHOW_RELEASE_HOUR) {
    await repository.releaseUncheckedReservations(toReservationDate(date));
  }

  return getAvailableParkingSpots(repository, input);
}
