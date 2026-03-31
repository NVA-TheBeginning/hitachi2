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

  const [reservationActor, availableSpotCount] = await Promise.all([
    repository.findReservationActor(),
    repository.countAvailableParkingSpots(),
  ]);

  if (!reservationActor || availableSpotCount === 0) {
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
