import { toReservationDate } from "@api/helpers";
import type { ParkingReservationRepository } from "@api/types";
import {
  NoParkingSpotAvailableError,
  SeedDataMissingError,
} from "../domain/errors";

export async function reserveParkingSpot(
  repository: ParkingReservationRepository,
  input: { date: string },
) {
  const reservationDate = toReservationDate(input.date);

  const [reservationActor, availableSpotCount, reservedSpotIds] =
    await Promise.all([
      repository.findReservationActor(),
      repository.countAvailableParkingSpots(),
      repository.findReservedSpotIdsForDate(reservationDate),
    ]);

  if (!reservationActor || availableSpotCount === 0) {
    throw new SeedDataMissingError();
  }

  const reservedSpotCount = reservedSpotIds.length;
  const parkingSpot = await repository.findFirstAvailableSpot(reservedSpotIds);

  if (!parkingSpot) {
    throw new NoParkingSpotAvailableError(input.date);
  }

  const reservation = await repository.createReservation({
    userId: reservationActor.userId,
    carId: reservationActor.carId,
    parkingSpotId: parkingSpot.id,
    date: reservationDate,
  });

  return {
    reservationId: reservation.id,
    date: input.date,
    parkingSpot: reservation.parkingSpot,
    remainingSpots: Math.max(availableSpotCount - reservedSpotCount - 1, 0),
  };
}
