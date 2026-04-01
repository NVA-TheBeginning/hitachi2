import { getCurrentReservationDateString, toReservationDate } from "@api/helpers";
import type { IReservationRepository } from "@api/types";
import { ReservationStatus } from "@hitachi2/db";
import {
  NoReservationForSpotTodayError,
  ParkingSpotNotFoundError,
  ReservationAlreadyCheckedInError,
} from "../domain/errors";

export async function checkInBySpot(repository: IReservationRepository, input: { spotId: string; userId: string }) {
  const spot = await repository.findParkingSpotById(input.spotId);
  if (!spot) throw new ParkingSpotNotFoundError(input.spotId);

  const today = toReservationDate(getCurrentReservationDateString());
  const reservation = await repository.findTodayReservationForUserAndSpot(input.userId, input.spotId, today);

  if (!reservation) throw new NoReservationForSpotTodayError(input.spotId);
  if (reservation.status !== ReservationStatus.RESERVED) throw new ReservationAlreadyCheckedInError(reservation.id);

  return repository.checkInReservation(reservation.id);
}
