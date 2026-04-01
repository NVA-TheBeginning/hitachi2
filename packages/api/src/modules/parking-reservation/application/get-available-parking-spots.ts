import { getCurrentReservationDateString, toReservationDate } from "@api/helpers";
import type { IReservationRepository } from "@api/types";

export async function getAvailableParkingSpots(
  repository: IReservationRepository,
  input?: { date?: string },
  now = new Date(),
) {
  const today = getCurrentReservationDateString(now);
  const date = input?.date ?? today;
  const reservationDate = toReservationDate(date);

  const freeUncheckedIn = date === today && now.getUTCHours() >= 11;

  const reservedSpotIds = await repository.findReservedSpotIdsForDate(reservationDate, freeUncheckedIn);
  const parkingSpots = await repository.findAvailableSpots(reservedSpotIds);

  return {
    date,
    parkingSpots,
    remainingSpots: parkingSpots.length,
  };
}
