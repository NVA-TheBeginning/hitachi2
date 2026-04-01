import type { ParkingReservationRepository } from "@api/types";
import { ReservationStatus } from "@hitachi2/db";
import {
  ReservationAlreadyCheckedInError,
  ReservationForbiddenError,
  ReservationNotFoundError,
} from "../domain/errors";

export async function checkInReservation(
  repository: ParkingReservationRepository,
  input: { reservationId: string; userId: string },
) {
  const reservation = await repository.findReservationById(input.reservationId);

  if (!reservation) throw new ReservationNotFoundError(input.reservationId);
  if (reservation.userId !== input.userId) throw new ReservationForbiddenError(input.reservationId);
  if (reservation.status !== ReservationStatus.RESERVED)
    throw new ReservationAlreadyCheckedInError(input.reservationId);

  return repository.checkInReservation(input.reservationId);
}
