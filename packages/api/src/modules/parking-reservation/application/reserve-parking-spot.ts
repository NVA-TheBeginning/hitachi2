import { toReservationDate } from "@api/helpers";
import type { ParkingReservationRepository } from "@api/types";
import { UserRole } from "@hitachi2/db";

import {
  NoParkingSpotAvailableError,
  ReservationLimitExceededError,
  SeedDataMissingError,
  UserCarMissingError,
} from "../domain/errors";

export async function reserveParkingSpot(
  repository: ParkingReservationRepository,
  input: { date: string; userId: string },
) {
  const reservationDate = toReservationDate(input.date);

  const [reservationActor, availableSpotCount, userInfo] = await Promise.all([
    repository.findReservationActor(input.userId),
    repository.countAvailableParkingSpots(),
    repository.getUserReservations(input.userId),
  ]);

  if (!reservationActor) {
    throw new UserCarMissingError();
  }

  if (availableSpotCount === 0) {
    throw new SeedDataMissingError();
  }

  const maxAllowed = userInfo.role === UserRole.MANAGER ? 30 : 5;

  if (userInfo.reservationCount >= maxAllowed) {
    throw new ReservationLimitExceededError(userInfo.reservationCount, maxAllowed);
  }

  const reservation = await repository.findAndCreateReservation(reservationDate, reservationActor);

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
