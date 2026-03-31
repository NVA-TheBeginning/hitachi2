import {
  ReservationAlreadyCheckedInError,
  ReservationForbiddenError,
  ReservationNotFoundError,
} from "../domain/errors";
import type { ParkingReservationRepository } from "./reserve-parking-spot";

export async function checkInReservation(
  repository: ParkingReservationRepository,
  input: { reservationId: string; userId: string },
) {
  const reservation = await repository.findReservationById(input.reservationId);

  if (!reservation) throw new ReservationNotFoundError(input.reservationId);
  if (reservation.userId !== input.userId)
    throw new ReservationForbiddenError(input.reservationId);
  if (reservation.status !== "RESERVED")
    throw new ReservationAlreadyCheckedInError(input.reservationId);

  return repository.checkInReservation(input.reservationId);
}
