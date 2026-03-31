import {
  getCurrentReservationDateString,
  toReservationDate,
} from "@api/helpers";
import type { ParkingReservationRepository } from "@api/types";

export async function getAvailableParkingSpots(
  repository: ParkingReservationRepository,
  input?: { date?: string },
) {
  const date = input?.date ?? getCurrentReservationDateString();
  const reservationDate = toReservationDate(date);
  const reservedSpotIds =
    await repository.findReservedSpotIdsForDate(reservationDate);
  const parkingSpots = await repository.findAvailableSpots(reservedSpotIds);

  return {
    date,
    parkingSpots,
    remainingSpots: parkingSpots.length,
  };
}
