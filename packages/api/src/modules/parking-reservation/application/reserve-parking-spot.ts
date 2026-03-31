import { toReservationDate } from "@api/helpers";
import type { ParkingReservationRepository } from "@api/types";
import {
  NoParkingSpotAvailableError,
  SeedDataMissingError,
  UserCarMissingError,
} from "../domain/errors";

export async function reserveParkingSpot(
  repository: ParkingReservationRepository,
  input: { date: string; userId: string },
) {
  const reservationDate = toReservationDate(input.date);
  
  const [reservationActor, availableSpotCount, reservedSpotIds] =
    await Promise.all([
      repository.findReservationActor(input.userId),
      repository.countAvailableParkingSpots(),
      repository.findReservedSpotIdsForDate(reservationDate),
    ]);

  if (!reservationActor) {
    throw new UserCarMissingError();
  }

  if (availableSpotCount === 0) {
    throw new SeedDataMissingError();
  }

  const reservation = await repository.findAndCreateReservation(
    reservationDate,
    reservationActor,
  );

  if (!reservation) {
    throw new NoParkingSpotAvailableError(input.date);
  }

  return {
    reservationId: reservation.id,
    date: input.date,
    parkingSpot: reservation.parkingSpot,
    remainingSpots: reservation.remainingSpots,
  };
}
