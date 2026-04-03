import { getCurrentReservationDateString, toReservationDate } from "@api/helpers";
import type { IReservationRepository } from "@api/types";
import { NoReservationForSpotTodayError, ParkingSpotNotFoundError } from "../domain/errors";

export async function confirmArrivalAtSpot(repository: IReservationRepository, input: { spotId: string; userId: string }) {
  const spot = await repository.findParkingSpotById(input.spotId);
  if (!spot) throw new ParkingSpotNotFoundError(input.spotId);

  const today = toReservationDate(getCurrentReservationDateString());
  const reservation = await repository.findTodayReservationForUserAndSpot(input.userId, input.spotId, today);

  if (!reservation) throw new NoReservationForSpotTodayError(input.spotId);

  return repository.confirmArrival(reservation.id);
}
