import {
  NoParkingSpotAvailableError,
  SeedDataMissingError,
} from "../domain/errors";

type ParkingSpotSummary = {
  id: string;
  name: string;
  charger: boolean;
};

export type ParkingReservationRepository = {
  findReservationActor(): Promise<{ userId: string; carId: string } | null>;
  findReservedSpotIdsForDate(date: Date): Promise<string[]>;
  findFirstAvailableSpot(
    excludedSpotIds: string[],
  ): Promise<ParkingSpotSummary | null>;
  countAvailableParkingSpots(): Promise<number>;
  createReservation(input: {
    userId: string;
    carId: string;
    parkingSpotId: string;
    date: Date;
  }): Promise<{ id: string; parkingSpot: ParkingSpotSummary }>;
  findReservationById(
    id: string,
  ): Promise<{ id: string; userId: string; status: string } | null>;
  checkInReservation(reservationId: string): Promise<{ checkedAt: Date }>;
};

export function toReservationDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

export async function reserveParkingSpot(
  repository: ParkingReservationRepository,
  input: { date: string },
) {
  const reservationDate = toReservationDate(input.date);

  const [reservationActor, availableSpotCount, reservedSpotIds] =
    await Promise.all([
      repository.findReservationActor(),
      repository.countAvailableParkingSpots(),
      repository.findReservedSpotIdsForDate(reservationDate),
    ]);

  if (!reservationActor || availableSpotCount === 0) {
    throw new SeedDataMissingError();
  }

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
