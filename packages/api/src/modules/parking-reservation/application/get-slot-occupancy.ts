import { getCurrentReservationDateString, toReservationDate } from "@api/helpers";
import type { IReservationRepository } from "@api/types";

export async function getParkingLotUtilization(repository: IReservationRepository, input?: { date?: string }) {
  const dateString = input?.date ?? getCurrentReservationDateString();
  return repository.getParkingLotUtilization(toReservationDate(dateString));
}
