import { getCurrentReservationDateString, toReservationDate } from "@api/helpers";
import type { IReservationRepository } from "@api/types";
import { NO_SHOW_RELEASE_HOUR } from "../../../config/reservation-policy";

export async function markNoShowReservations(
  repository: IReservationRepository,
  date: string,
  now = new Date(),
) {
  const today = getCurrentReservationDateString(now);
  if (date === today && now.getUTCHours() >= NO_SHOW_RELEASE_HOUR) {
    await repository.markNoShowReservations(toReservationDate(date));
  }
}
