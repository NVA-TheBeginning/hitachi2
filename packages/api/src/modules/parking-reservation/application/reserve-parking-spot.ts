import { getReservationLimit, toReservationDate } from "@api/helpers";
import type { IReservationRepository } from "@api/types";
import {
  NoCarLinkedToUserError,
  NoParkingSpotAvailableError,
  ReservationCarNotFoundError,
  ReservationLimitExceededError,
  SeedDataMissingError,
} from "../domain/errors";

export async function reserveParkingSpot(
  repository: IReservationRepository,
  input: { date: string; userId: string; carId?: string },
) {
  const reservationDate = toReservationDate(input.date);

  const [reservationActor, availableSpotCount, userInfo] = await Promise.all([
    repository.findReservationActor(input.userId, input.carId),
    repository.countAvailableParkingSpots(),
    repository.getUserReservations(input.userId),
  ]);

  if (!reservationActor) {
    if (input.carId) {
      throw new ReservationCarNotFoundError(input.carId);
    }

    throw new NoCarLinkedToUserError();
  }

  if (availableSpotCount === 0) {
    throw new SeedDataMissingError();
  }

  const maxAllowed = getReservationLimit(userInfo.role);

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
