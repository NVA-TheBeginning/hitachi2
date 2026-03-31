import type { ParkingReservationRepository } from "./parking-reservation.repository";
import {
  getCurrentReservationDateString,
  toReservationDate,
} from "./reservation-date";

type AvailableParkingSpotsRepository = Pick<
  ParkingReservationRepository,
  "findAvailableParkingSpots" | "findReservedSpotIdsForDate"
>;

export async function getAvailableParkingSpots(
  repository: AvailableParkingSpotsRepository,
  input?: { date?: string },
) {
  const reservationDate = input?.date ?? getCurrentReservationDateString();
  const reservedSpotIds = await repository.findReservedSpotIdsForDate(
    toReservationDate(reservationDate),
  );

  const spots = await repository.findAvailableParkingSpots(reservedSpotIds);

  return {
    date: reservationDate,
    count: spots.length,
    spots,
  };
}
