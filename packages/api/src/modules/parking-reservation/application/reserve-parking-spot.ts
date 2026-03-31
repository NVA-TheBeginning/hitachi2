import {
  NoParkingSpotAvailableError,
  SeedDataMissingError,
} from "../domain/errors";

type ReservationActor = {
  userId: string;
  carId: string;
};

type ParkingSpotSummary = {
  id: string;
  name: string;
  charger: boolean;
};

type ReservationDraft = {
  userId: string;
  carId: string;
  parkingSpotId: string;
  date: Date;
};

type CreatedReservation = {
  id: string;
  parkingSpot: ParkingSpotSummary;
};

export type ParkingReservationRepository = {
  findReservationActor(): Promise<ReservationActor | null>;
  findReservedSpotIdsForDate(date: Date): Promise<string[]>;
  findFirstAvailableSpot(
    excludedSpotIds: string[],
  ): Promise<ParkingSpotSummary | null>;
  countAvailableParkingSpots(): Promise<number>;
  createReservation(input: ReservationDraft): Promise<CreatedReservation>;
};

export function toReservationDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

export async function reserveParkingSpot(
  repository: ParkingReservationRepository,
  input: { date: string },
) {
  const reservationDate = toReservationDate(input.date);
  const reservationActor = await repository.findReservationActor();

  if (!reservationActor) {
    throw new SeedDataMissingError();
  }

  const availableSpotCount = await repository.countAvailableParkingSpots();

  if (availableSpotCount === 0) {
    throw new SeedDataMissingError();
  }

  const reservedSpotIds =
    await repository.findReservedSpotIdsForDate(reservationDate);
  const reservedSpotCount = reservedSpotIds.length;
  const parkingSpot = await repository.findFirstAvailableSpot(reservedSpotIds);

  if (!parkingSpot) {
    throw new NoParkingSpotAvailableError(input.date);
  }

  const reservation = await repository.createReservation({
    userId: reservationActor.userId,
    carId: reservationActor.carId,
    parkingSpotId: parkingSpot.id,
    date: reservationDate,
  });

  return {
    reservationId: reservation.id,
    date: input.date,
    parkingSpot: reservation.parkingSpot,
    remainingSpots: Math.max(availableSpotCount - reservedSpotCount - 1, 0),
  };
}
