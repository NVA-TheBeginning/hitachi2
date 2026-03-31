import type { ReservationStatus, UserRole } from "@hitachi2/db";

export interface JobQueue {
  send<T extends object>(name: string, data: T): Promise<string | null>;
}

export type ParkingSpotSummary = {
  id: string;
  name: string;
  charger: boolean;
};

export interface IReservationRepository {
  findReservationActor(): Promise<{ userId: string; carId: string } | null>;
  findReservedSpotIdsForDate(date: Date): Promise<string[]>;
  findFirstAvailableSpot(excludedSpotIds: string[]): Promise<ParkingSpotSummary | null>;
  findAvailableSpots(excludedSpotIds: string[]): Promise<ParkingSpotSummary[]>;
  countAvailableParkingSpots(): Promise<number>;
  createReservation(input: {
    userId: string;
    carId: string;
    parkingSpotId: string;
    date: Date;
  }): Promise<{ id: string; parkingSpot: ParkingSpotSummary }>;
  findAndCreateReservation(
    date: Date,
    actor: { userId: string; carId: string },
  ): Promise<{
    id: string;
    parkingSpot: ParkingSpotSummary;
    remainingSpots: number;
  } | null>;
  findReservationById(id: string): Promise<{ id: string; userId: string; status: ReservationStatus } | null>;
  checkInReservation(reservationId: string): Promise<{ checkedAt: Date }>;
  getUserReservations(userId: string): Promise<{ reservationCount: number; role: UserRole }>;
}
