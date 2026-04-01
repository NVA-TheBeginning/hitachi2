import { getCurrentReservationDateString, toReservationDate } from "@api/helpers";
import type { IReservationRepository } from "@api/types";

export async function getAvailableParkingSpots(
  repository: IReservationRepository,
  input?: { date?: string },
  now = new Date(),
) {
  const date = input?.date ?? getCurrentReservationDateString(now);
  const reservationDate = toReservationDate(date);

  const isToday = date === getCurrentReservationDateString(now);
  const freeUncheckedIn = isToday && now.getUTCHours() >= 11;

  const reservedSpotIds = await repository.findReservedSpotIdsForDate(reservationDate, freeUncheckedIn);
  const parkingSpots = await repository.findAvailableSpots(reservedSpotIds);

  return {
    date,
    parkingSpots,
    remainingSpots: parkingSpots.length,
  };
}
