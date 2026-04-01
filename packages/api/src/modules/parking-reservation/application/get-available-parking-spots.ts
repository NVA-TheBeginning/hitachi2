import { getCurrentReservationDateString, toReservationDate } from "@api/helpers";
import type { IReservationRepository } from "@api/types";

export async function getAvailableParkingSpots(repository: IReservationRepository, input?: { date?: string }) {
  const date = input?.date ?? getCurrentReservationDateString();
  const reservationDate = toReservationDate(date);
  const reservedSpotIds = await repository.findReservedSpotIdsForDate(reservationDate);
  const parkingSpots = await repository.findAvailableSpots(reservedSpotIds);

  return {
    date,
    parkingSpots,
    remainingSpots: parkingSpots.length,
  };
}
