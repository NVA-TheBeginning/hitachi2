import {
  NoParkingSpotAvailableError,
  SeedDataMissingError,
} from "../domain/errors";

export interface ReserveParkingSpotInput {
  date: string;
}

export interface ParkingSpotSummary {
  id: string;
  name: string;
  charger: boolean;
}

export interface ReservationSummary {
  id: string;
  parkingSpot: ParkingSpotSummary;
}

export interface ParkingReservationRepository {
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
  }): Promise<ReservationSummary>;
}

export interface ReserveParkingSpotResult {
  reservationId: string;
  date: string;
  parkingSpot: ParkingSpotSummary;
  remainingSpots: number;
}

export function toReservationDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

export async function reserveParkingSpot(
  repository: ParkingReservationRepository,
  input: ReserveParkingSpotInput,
): Promise<ReserveParkingSpotResult> {
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
